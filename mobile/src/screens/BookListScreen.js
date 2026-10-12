import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Share,
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
import QuickActions from '../components/QuickActions';
import { colors, fonts, radii } from '../theme';

// How far the shortcut card overlaps the bottom of the hero banner.
const CARD_OVERLAP = 36;

// There's no public download page yet; add the link here once there is one.
const SHARE_APP_MESSAGE =
  'Law Business — বাংলাদেশের আইন ও আইনি তথ্য এক অ্যাপে।\nLaw Business: Bangladeshi laws and legal posts in one app.';

function shareApp() {
  // A dismissed share sheet resolves normally; only real failures land here.
  Share.share({ message: SHARE_APP_MESSAGE }).catch(() => {});
}

const BENGALI_DIGITS = '০১২৩৪৫৬৭৮৯';

function toBengaliDigits(n) {
  return String(n).replace(/\d/g, (d) => BENGALI_DIGITS[d]);
}

function Avatar({ title, index }) {
  const initial = title?.trim()?.charAt(0)?.toUpperCase() || '?';
  const { bg, fg } = colors.avatarPalette[index % colors.avatarPalette.length];
  return (
    <HexAvatar size={44} label={initial} colorsFrom={bg} colorsTo={bg} labelColor={fg} style={styles.avatar} />
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
  const isFocused = useIsFocused();
  const quickActions = [
    { label: 'সর্বশেষ', icon: 'clock-o', color: colors.cyan, onPress: () => navigation.navigate('Latest') },
    { label: 'খুঁজুন', icon: 'search', color: colors.purple, onPress: () => navigation.navigate('Search') },
    { label: 'সংরক্ষিত', icon: 'bookmark', color: colors.hero, onPress: () => navigation.navigate('Saved') },
    { label: 'শেয়ার', icon: 'share-alt', color: colors.magenta, onPress: shareApp },
  ];
  // Book names shown as each highlight's source line.
  const bookTitles = useMemo(() => {
    const map = {};
    books.forEach((b) => { map[b.id] = b.title; });
    return map;
  }, [books]);

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
      {/* Light icons on the colored header, only while this screen is shown. */}
      {isFocused && <StatusBar style="light" />}
      {isOffline && <OfflineBanner />}
      <FlatList
        contentContainerStyle={books.length === 0 ? styles.emptyContainer : styles.list}
        data={books}
        ListHeaderComponent={
          <>
            {highlights.length > 0 ? (
              <HighlightsSlider
                posts={highlights}
                bookTitles={bookTitles}
                overlap={CARD_OVERLAP}
                onPressPost={(post) => navigation.navigate('PostDetail', { post })}
              />
            ) : (
              <View style={styles.headerSpacer} />
            )}
            <QuickActions overlap={highlights.length > 0 ? CARD_OVERLAP : 0} actions={quickActions} />
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>সব আইনের বই</Text>
              <Text style={styles.sectionCount}>{`${toBengaliDigits(books.length)}টি বই`}</Text>
            </View>
          </>
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
  // No horizontal padding here so the hero banner can run edge to edge;
  // rows get their side margins instead.
  list: { paddingBottom: 12 },
  headerSpacer: { height: 12 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 22,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 18, fontFamily: fonts.body, color: colors.textPrimary },
  sectionCount: { fontSize: 14, fontFamily: fonts.bodyMedium, color: colors.textSecondary },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  row: {
    flexDirection: 'row',
    padding: 12,
    marginHorizontal: 12,
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
