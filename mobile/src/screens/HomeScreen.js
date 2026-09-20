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
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const hasMounted = useRef(false);
  // Every unfiltered post pulled for this book so far (the cached first page
  // on open, plus any further pages scrolled into view) — the offline search
  // source of truth. Only ever holds search-less results, so offline
  // filtering never runs against a stale search-scoped subset.
  const loadedPostsRef = useRef([]);
  // Mirrors the rendered `posts` synchronously, so the `onEndReached` guards
  // and the append path read the current list instead of a stale closure.
  const postsRef = useRef([]);
  // Rows received from the server so far for the *current* query. Counted
  // separately from `posts.length` because `filterPosts` below can drop rows
  // from a page; deriving the next offset from the visible list would then
  // silently re-request the rows it dropped.
  const offsetRef = useRef(0);
  // Refs (not the `loadingMore`/`hasMore` state) because FlatList can fire
  // `onEndReached` again before React has re-rendered with the new state —
  // which is exactly how overlapping page requests happen.
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(false);
  const debouncedQueryRef = useRef('');
  const isConnectedRef = useRef(true);

  // Keeps the rendered list and its synchronous mirror in lockstep.
  function applyPosts(next) {
    postsRef.current = next;
    setPosts(next);
  }

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

  // Loads the *first page* for `query` (the optional search term) — used on
  // mount, on every search change, on pull-to-refresh and on reconnect. It
  // always replaces the list and resets paging to the top, so it can never
  // append a second copy of page one on top of the cached one. Only a
  // query-less call touches the cache, and only with its first page.
  const load = useCallback(async (query) => {
    const term = query || '';
    offsetRef.current = 0;

    if (!isConnectedRef.current) {
      // Known offline: skip the network call entirely, filter whatever we
      // have locally (cache, or pages fetched earlier this session), and
      // don't offer further pages — there is nothing to page into offline.
      setIsOffline(true);
      hasMoreRef.current = false;
      setHasMore(false);
      applyPosts(filterPosts(loadedPostsRef.current, term));
      setError(loadedPostsRef.current.length === 0 ? 'No internet connection and no saved data yet.' : null);
      return;
    }

    try {
      const page = await fetchPosts(bookId, term || undefined, { offset: 0 });
      offsetRef.current = page.items.length;
      hasMoreRef.current = page.has_more;
      setHasMore(page.has_more);
      applyPosts(filterPosts(page.items, term));
      setError(null);
      setIsOffline(false);
      if (!term) {
        loadedPostsRef.current = page.items;
        setCachedPosts(bookId, page.items);
      }
    } catch (err) {
      // Live fetch failed (offline, timeout, server error, or a connectivity
      // transition that raced isConnectedRef) — fall back to what we have
      // locally instead of a hard error, as long as there is something to
      // show, and stop paging until the next refresh/reconnect.
      setIsOffline(true);
      hasMoreRef.current = false;
      setHasMore(false);
      if (loadedPostsRef.current.length > 0) {
        applyPosts(filterPosts(loadedPostsRef.current, term));
        setError(null);
      } else {
        setError(err.message || 'Something went wrong');
      }
    }
  }, [bookId]);

  // Next page for infinite scroll. All the `onEndReached` guards live here:
  // never while a page is in flight, never once the server said there is
  // nothing left, never on an empty list (FlatList fires `onEndReached` for
  // an empty list too), and never while offline — extra pages are
  // online-only, offline we show exactly what is cached.
  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMoreRef.current) return;
    if (postsRef.current.length === 0 || !isConnectedRef.current) return;

    const term = debouncedQueryRef.current;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const page = await fetchPosts(bookId, term || undefined, { offset: offsetRef.current });
      offsetRef.current += page.items.length;
      hasMoreRef.current = page.has_more;
      setHasMore(page.has_more);

      // De-dupe by id: offset paging can re-serve a row if a post was added
      // or deleted between the two requests.
      const seen = new Set(postsRef.current.map((post) => post.id));
      const incoming = filterPosts(page.items, term).filter((post) => !seen.has(post.id));
      applyPosts([...postsRef.current, ...incoming]);

      if (!term) {
        // Grow the offline-search source with the unfiltered page, but
        // deliberately don't re-write the cache: the cache stays "page one"
        // so a half-scrolled session never persists a misleading subset.
        const cachedSeen = new Set(loadedPostsRef.current.map((post) => post.id));
        loadedPostsRef.current = [
          ...loadedPostsRef.current,
          ...page.items.filter((post) => !cachedSeen.has(post.id)),
        ];
      }
    } catch {
      // A failed *next* page never escalates to the error screen — the user
      // keeps the list they already have.
      setIsOffline(true);
      hasMoreRef.current = false;
      setHasMore(false);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [bookId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = await getCachedPosts(bookId);
      if (cancelled) return;
      if (cached && cached.length > 0) {
        loadedPostsRef.current = cached;
        applyPosts(cached);
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
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          ) : null
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
  footer: { paddingVertical: 16 },
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
