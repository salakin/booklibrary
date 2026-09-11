import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { fetchPosts } from '../api';

function Avatar({ title }) {
  const initial = title?.trim()?.charAt(0)?.toUpperCase() || '?';
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{initial}</Text>
    </View>
  );
}

function truncate(text, max = 100) {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export default function HomeScreen({ navigation }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setPosts(await fetchPosts());
    } catch (err) {
      setError(err.message || 'Something went wrong');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Couldn't load posts.</Text>
        <Text style={styles.errorDetail}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => { setLoading(true); load().finally(() => setLoading(false)); }}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      contentContainerStyle={posts.length === 0 ? styles.emptyContainer : styles.list}
      data={posts}
      keyExtractor={(item) => String(item.id)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyText}>No posts yet.</Text>
          <Text style={styles.emptyDetail}>Create one from the admin panel to see it here.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.row}
          onPress={() => navigation.navigate('PostDetail', { post: item })}
        >
          <Avatar title={item.title} />
          <View style={styles.rowText}>
            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.author} numberOfLines={1}>{item.author}</Text>
            <Text style={styles.preview} numberOfLines={2}>{truncate(item.description)}</Text>
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 12 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  row: {
    flexDirection: 'row',
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  rowText: { flex: 1 },
  title: { fontSize: 16, fontWeight: '600', color: '#111' },
  author: { fontSize: 13, color: '#666', marginTop: 2 },
  preview: { fontSize: 13, color: '#888', marginTop: 4 },
  errorText: { fontSize: 16, fontWeight: '600', color: '#dc2626', marginBottom: 6 },
  errorDetail: { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 16 },
  retryButton: { backgroundColor: '#2563eb', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 6 },
  retryText: { color: '#fff', fontWeight: '600' },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 4 },
  emptyDetail: { fontSize: 13, color: '#777' },
});
