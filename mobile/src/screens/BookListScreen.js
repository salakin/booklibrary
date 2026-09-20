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
import { fetchBooks } from '../api';
import { getCachedBooks, setCachedBooks } from '../cache';
import ScreenBackground from '../components/ScreenBackground';
import Button from '../components/Button';
import HexAvatar from '../components/HexAvatar';
import OfflineBanner from '../components/OfflineBanner';
import { colors, fonts, radii } from '../theme';

// Cycle through distinct gradient pairs so consecutive books don't all
// share the same hexagon color.
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
    <HexAvatar size={44} label={initial} colorsFrom={colorsFrom} colorsTo={colorsTo} style={styles.avatar} />
  );
}

export default function BookListScreen({ navigation }) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  // Mirrors `books` synchronously so the NetInfo/reconnect listener, the
  // background-refresh failure handler and the `onEndReached` guards can all
  // read the current list without depending on stale closures.
  const booksRef = useRef([]);
  // How many rows the server has actually handed us, tracked separately from
  // `books.length` so the next page's offset stays right even if the
  // rendered list and the fetched list ever diverge.
  const offsetRef = useRef(0);
  // Ref rather than the `loadingMore`/`hasMore` state for the same reason:
  // FlatList can fire `onEndReached` again before React has re-rendered with
  // the updated state, which is exactly how duplicate page requests happen.
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(false);

  // Cache-first + background-refresh: attempt a live fetch of the *first
  // page*, and on success update the screen and the cache. On failure, keep
  // showing whatever is already on screen (cached or previously fetched) and
  // flip on the offline indicator instead of the hard error screen — unless
  // there's nothing at all to show, in which case fall back to the error
  // state. Always restarts paging from the top, so it can never append a
  // second copy of page one on top of the cached one.
  const load = useCallback(async () => {
    try {
      const page = await fetchBooks({ offset: 0 });
      booksRef.current = page.items;
      offsetRef.current = page.items.length;
      hasMoreRef.current = page.has_more;
      setBooks(page.items);
      setHasMore(page.has_more);
      setError(null);
      setIsOffline(false);
      // Only page one is cached — it's what the user sees on open, and
      // persisting a half-scrolled list would write back an arbitrary subset
      // that then looks like the complete list when read offline.
      setCachedBooks(page.items);
    } catch (err) {
      setIsOffline(true);
      // Further pages are online-only, so stop offering them; `load` runs
      // again on reconnect or pull-to-refresh and restores paging from page
      // one.
      hasMoreRef.current = false;
      setHasMore(false);
      if (booksRef.current.length === 0) {
        setError(err.message || 'Something went wrong');
      }
    }
  }, []);

  // Next page for infinite scroll. Every `onEndReached` guard lives here:
  // never while a page is already in flight, never once the server has said
  // there's nothing left, and never on an empty list (FlatList fires
  // `onEndReached` once for an empty list too, which would otherwise
  // re-request page one on every empty render).
  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMoreRef.current || booksRef.current.length === 0) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const page = await fetchBooks({ offset: offsetRef.current });
      offsetRef.current += page.items.length;
      hasMoreRef.current = page.has_more;
      // De-dupe by id: offset paging can re-serve a row if a book was added
      // or renamed (this list is title-ordered) between the two requests.
      const seen = new Set(booksRef.current.map((book) => book.id));
      const merged = [...booksRef.current, ...page.items.filter((book) => !seen.has(book.id))];
      booksRef.current = merged;
      setBooks(merged);
      setHasMore(page.has_more);
      setIsOffline(false);
    } catch {
      // A failed *next* page never escalates to the error screen — the user
      // keeps the list they already have. Flag offline and stop paging until
      // a refresh or reconnect.
      setIsOffline(true);
      hasMoreRef.current = false;
      setHasMore(false);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = await getCachedBooks();
      if (cancelled) return;
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
