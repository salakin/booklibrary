import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { fetchBooks, fetchHighlights } from '../api';
import {
  getCachedBooks,
  setCachedBooks,
  getCachedHighlights,
  setCachedHighlights,
} from '../cache';
import HighlightsSlider from '../components/HighlightsSlider';
import ScreenBackground from '../components/ScreenBackground';
import Button from '../components/Button';
import HexAvatar from '../components/HexAvatar';
import OfflineBanner from '../components/OfflineBanner';
import { colors, fonts, radii } from '../theme';

// One flat color per hexagon, cycled by position so no two consecutive
// books share a color.
const AVATAR_COLORS = [colors.purple, colors.magenta, colors.cyan];

function Avatar({ title, index }) {
  const initial = title?.trim()?.charAt(0)?.toUpperCase() || '?';
  const color = AVATAR_COLORS[index % AVATAR_COLORS.length];
  return (
    <HexAvatar size={44} label={initial} colorsFrom={color} colorsTo={color} style={styles.avatar} />
  );
}

export default function BookListScreen({ navigation }) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  // Mirrors `books` synchronously so the NetInfo/reconnect listener can read
  // the current list without depending on a stale closure.
  const booksRef = useRef([]);
  // Admin-highlighted posts for the top slider. Best-effort: failures
  // leave whatever is already there (cached or empty = slider hidden).
  const [highlights, setHighlights] = useState([]);

  const loadHighlights = useCallback(async () => {
    try {
      const items = await fetchHighlights(10);
      if (!Array.isArray(items)) return;
      setHighlights(items);
      setCachedHighlights(items);
    } catch {
      // Keep current slides; never surface an error for the slider.
    }
  }, []);

  // Cache-first + background-refresh: fetch the full list live, and on
  // success update the screen and the cache. On failure, keep showing
  // whatever is already on screen (cached or previously fetched) and flip
  // on the offline indicator instead of the hard error screen — unless
  // there's nothing at all to show, in which case fall back to the error
  // state.
  const load = useCallback(async () => {
    try {
      const all = await fetchBooks();
      booksRef.current = all;
      setBooks(all);
      setError(null);
      setIsOffline(false);
      setCachedBooks(all);
      loadHighlights();
    } catch (err) {
      setIsOffline(true);
      if (booksRef.current.length === 0) {
        setError(err.message || 'Something went wrong');
      }
    }
  }, [loadHighlights]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [cached, cachedHighlights] = await Promise.all([getCachedBooks(), getCachedHighlights()]);
      if (cancelled) return;
      if (Array.isArray(cachedHighlights) && cachedHighlights.length > 0) setHighlights(cachedHighlights);
      if (cached && cached.length > 0) {
        booksRef.current = cached;
        setBooks(cached);
        setLoading(false);
      }
      await load();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  // Auto-refresh the moment connectivity comes back, no user action needed.
  useEffect(() => {
    let wasOffline = false;
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isConnected = state.isConnected === true && state.isInternetReachable !== false;
      if (!isConnected) {
        wasOffline = true;
      } else if (wasOffline) {
        wasOffline = false;
        load();
      }
    });
    return () => unsubscribe();
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

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
        <View style={styles.center}>
          <Text style={styles.errorText}>Couldn't load books.</Text>
          <Text style={styles.errorDetail}>{error}</Text>
          <Button onPress={() => { setLoading(true); load().finally(() => setLoading(false)); }}>
            Retry
          </Button>
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground style={styles.container}>
      {isOffline && <OfflineBanner />}
      <FlatList
        contentContainerStyle={books.length === 0 ? styles.emptyContainer : styles.list}
        data={books}
        ListHeaderComponent={
          <HighlightsSlider
            posts={highlights}
            onPressPost={(post) => navigation.navigate('PostDetail', { post })}
          />
        }
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
            <Text style={styles.emptyText}>No books yet.</Text>
            <Text style={styles.emptyDetail}>Create one from the admin panel to see it here.</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('Home', { bookId: item.id, bookTitle: item.title })}
          >
            <Avatar title={item.title} index={index} />
            <View style={styles.rowText}>
              <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
              {!!item.author && (
                <Text style={styles.author} numberOfLines={1}>{item.author}</Text>
              )}
            </View>
          </TouchableOpacity>
        )}
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
    marginRight: 14,
  },
  rowText: { flex: 1 },
  title: { fontSize: 16, fontFamily: fonts.body, color: colors.textPrimary },
  author: { fontSize: 14, fontFamily: fonts.bodyMedium, color: colors.textSecondary, marginTop: 2 },
  errorText: { fontSize: 16, fontFamily: fonts.body, color: colors.danger, marginBottom: 6 },
  errorDetail: { fontSize: 14, fontFamily: fonts.bodyMedium, color: colors.textSecondary, textAlign: 'center', marginBottom: 16 },
  emptyText: { fontSize: 16, fontFamily: fonts.body, color: colors.textPrimary, marginBottom: 4 },
  emptyDetail: { fontSize: 14, fontFamily: fonts.bodyMedium, color: colors.textSecondary },
});
