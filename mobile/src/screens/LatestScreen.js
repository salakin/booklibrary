import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { fetchLatestPosts } from '../api';
import { getCachedLatest, setCachedLatest } from '../cache';
import ScreenBackground from '../components/ScreenBackground';
import OfflineBanner from '../components/OfflineBanner';
import PostRow from '../components/PostRow';
import { colors, fonts } from '../theme';

// The newest posts across every book. Cache-first like the other lists:
// shows the last fetched copy immediately, then refreshes it.
export default function LatestScreen({ navigation }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const load = useCallback(async () => {
    try {
      const fresh = await fetchLatestPosts();
      setPosts(fresh);
      setIsOffline(false);
      setCachedLatest(fresh);
    } catch {
      setIsOffline(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = await getCachedLatest();
      if (cancelled) return;
      if (cached?.length) {
        setPosts(cached);
        setLoading(false);
      }
      await load();
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
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

  return (
    <ScreenBackground style={styles.container}>
      {isOffline && <OfflineBanner />}
      <FlatList
        contentContainerStyle={posts.length === 0 ? styles.emptyContainer : styles.list}
        data={posts}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>
              {isOffline ? 'No internet connection, and no saved copy yet.' : 'No posts yet.'}
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <PostRow post={item} index={index} onPress={() => navigation.navigate('PostDetail', { post: item })} />
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
  emptyText: { fontSize: 15, fontFamily: fonts.bodyMedium, color: colors.textSecondary, textAlign: 'center' },
});
