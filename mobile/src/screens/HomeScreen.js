import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import NetInfo from '@react-native-community/netinfo';
import { fetchPosts } from '../api';
import { getCachedPosts, setCachedPosts } from '../cache';
import ScreenBackground from '../components/ScreenBackground';
import Button from '../components/Button';
import OfflineBanner from '../components/OfflineBanner';
import { colors, fonts, radii } from '../theme';

const SEARCH_DEBOUNCE_MS = 400;

// Cycle through distinct gradient pairs so consecutive posts don't all
// share the same avatar color.
const AVATAR_PALETTE = [
  [colors.purple, colors.magenta],
  [colors.cyan, colors.purple],
  [colors.magenta, colors.cyan],
  [colors.purple, colors.cyan],
];

function Avatar({ title, index }) {
  const initial = title?.trim()?.charAt(0)?.toUpperCase() || '?';
  const [colorsFrom, colorsTo] = AVATAR_PALETTE[index % AVATAR_PALETTE.length];
  return (
    <LinearGradient
      colors={[colorsFrom, colorsTo]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.avatar, styles.avatarCircle]}
    >
      <Text style={styles.avatarLabel}>{initial}</Text>
    </LinearGradient>
  );
}

function truncate(text, max = 100) {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

// Same substring predicate used both as the online safety-net filter (in
// case the API hasn't picked up server-side search yet) and as the entire
// search implementation while offline, applied to the last-known-good full
// post list instead of a live server response.
function filterPosts(list, term) {
  if (!term) return list;
  const lower = term.toLowerCase();
  return list.filter(
    (post) =>
      post.title?.toLowerCase().includes(lower) ||
      post.description?.toLowerCase().includes(lower)
  );
}

export default function HomeScreen({ navigation, route }) {
  const { bookId } = route.params;
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const hasMounted = useRef(false);
  // The full, unfiltered post list for this book — the offline search
  // source of truth. Kept in a ref since it's an implementation detail of
  // `load`/offline filtering, not something that needs to drive renders on
  // its own (`posts`, what's actually rendered, is derived from it).
  const fullPostsRef = useRef([]);
  const debouncedQueryRef = useRef('');
  const isConnectedRef = useRef(true);

  useEffect(() => {
    debouncedQueryRef.current = debouncedQuery;
  }, [debouncedQuery]);

  useEffect(() => {
    NetInfo.fetch().then((state) => {
      isConnectedRef.current = state.isConnected === true && state.isInternetReachable !== false;
    });
  }, []);

  // Debounce the raw input so we don't fire a request on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Cache-first + background-refresh, offline-search-aware. `query` is the
  // (optional) search term. Only a query-less call caches the result, since
  // the offline fallback always filters against the *full* post list, never
  // a stale search-scoped subset.
  const load = useCallback(async (query) => {
    const term = query || '';

    if (!isConnectedRef.current) {
      // Known offline: skip the network call entirely and filter whatever
      // full list we already have (cache or previous live fetch).
      setIsOffline(true);
      setPosts(filterPosts(fullPostsRef.current, term));
      setError(fullPostsRef.current.length === 0 ? 'No internet connection and no saved data yet.' : null);
      return;
    }

    try {
      const results = await fetchPosts(bookId, term || undefined);
      const filtered = filterPosts(results, term);
      setPosts(filtered);
      setError(null);
      setIsOffline(false);
      if (!term) {
        fullPostsRef.current = results;
        setCachedPosts(bookId, results);
      }
    } catch (err) {
      // Live fetch failed (offline, timeout, server error, or a connectivity
      // transition that raced isConnectedRef) — fall back to the cached full
      // list instead of a hard error, as long as we have something to show.
      setIsOffline(true);
      if (fullPostsRef.current.length > 0) {
        setPosts(filterPosts(fullPostsRef.current, term));
        setError(null);
      } else {
        setError(err.message || 'Something went wrong');
      }
    }
  }, [bookId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = await getCachedPosts(bookId);
      if (cancelled) return;
      if (cached && cached.length > 0) {
        fullPostsRef.current = cached;
        setPosts(cached);
        setLoading(false);
      }
      await load(debouncedQuery);
      if (!cancelled) {
        setLoading(false);
        hasMounted.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
    // Only the very first run should show the full-screen loader; later
    // reruns (triggered by debouncedQuery changes) use `searching` instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  useEffect(() => {
    // Skip the initial mount (already handled by the effect above).
    if (!hasMounted.current) return;
    setSearching(true);
    load(debouncedQuery).finally(() => setSearching(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  // Auto-refresh the moment connectivity comes back, no user action needed.
  useEffect(() => {
    let wasOffline = false;
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = state.isConnected === true && state.isInternetReachable !== false;
      isConnectedRef.current = connected;
      if (!connected) {
        wasOffline = true;
      } else if (wasOffline) {
        wasOffline = false;
        load(debouncedQueryRef.current);
      }
    });
    return () => unsubscribe();
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load(debouncedQuery);
    setRefreshing(false);
  }

  const isSearchActive = debouncedQuery.length > 0;

  const searchBar = (
    <View style={styles.searchWrap}>
      <Text style={styles.searchIcon}>🔍</Text>
      <TextInput
        style={styles.searchInput}
        placeholder="Search by title..."
        placeholderTextColor={colors.textMuted}
        value={searchQuery}
        onChangeText={setSearchQuery}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
      {searching && <ActivityIndicator size="small" color={colors.accent} />}
      {!searching && searchQuery.length > 0 && (
        <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.clearIcon}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <ScreenBackground style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </ScreenBackground>
    );
  }

  if (error) {
    return (
      <ScreenBackground style={styles.container}>
        {searchBar}
        <View style={styles.center}>
          <Text style={styles.errorText}>Couldn't load posts.</Text>
          <Text style={styles.errorDetail}>{error}</Text>
          <Button onPress={() => { setLoading(true); load(debouncedQuery).finally(() => setLoading(false)); }}>
            Retry
          </Button>
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground style={styles.container}>
      {searchBar}
      {isOffline && <OfflineBanner />}
      <FlatList
        contentContainerStyle={posts.length === 0 ? styles.emptyContainer : styles.list}
        data={posts}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            {isSearchActive ? (
              <>
                <Text style={styles.emptyText}>No books found for "{debouncedQuery}".</Text>
                <Text style={styles.emptyDetail}>Try a different title or keyword.</Text>
              </>
            ) : (
              <>
                <Text style={styles.emptyText}>No posts yet.</Text>
                <Text style={styles.emptyDetail}>Create one from the admin panel to see it here.</Text>
              </>
            )}
          </View>
        }
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('PostDetail', { post: item })}
          >
            <Avatar title={item.title} index={index} />
            <View style={styles.rowText}>
              <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.preview} numberOfLines={2}>{truncate(item.description)}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginHorizontal: 12,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.md,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16, fontFamily: fonts.bodyMedium, color: colors.textPrimary, paddingVertical: 2 },
  clearIcon: { fontSize: 16, color: colors.textMuted, paddingHorizontal: 4 },
  list: { padding: 12 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  row: {
    flexDirection: 'row',
    padding: 12,
    marginBottom: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: radii.md,
    shadowColor: colors.shadowPurple,
    shadowOpacity: 1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    marginRight: 14,
  },
  avatarCircle: {
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: {
    color: colors.white,
    fontFamily: fonts.heading,
    fontSize: 18,
  },
  rowText: { flex: 1 },
  title: { fontSize: 16, fontFamily: fonts.body, color: colors.textPrimary },
  preview: { fontSize: 14, fontFamily: fonts.bodyMedium, color: colors.textMuted, marginTop: 4 },
  errorText: { fontSize: 16, fontFamily: fonts.body, color: colors.danger, marginBottom: 6 },
  errorDetail: { fontSize: 14, fontFamily: fonts.bodyMedium, color: colors.textSecondary, textAlign: 'center', marginBottom: 16 },
  emptyText: { fontSize: 16, fontFamily: fonts.body, color: colors.textPrimary, marginBottom: 4 },
  emptyDetail: { fontSize: 14, fontFamily: fonts.bodyMedium, color: colors.textSecondary },
});
