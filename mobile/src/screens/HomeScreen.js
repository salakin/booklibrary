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
import { fetchBooks } from '../api';

function CoverPlaceholder({ title }) {
  const initial = title?.trim()?.charAt(0)?.toUpperCase() || '?';
  return (
    <View style={styles.cover}>
      <Text style={styles.coverText}>{initial}</Text>
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setBooks(await fetchBooks());
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
        <Text style={styles.errorText}>Couldn't load your library.</Text>
        <Text style={styles.errorDetail}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => { setLoading(true); load().finally(() => setLoading(false)); }}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      contentContainerStyle={books.length === 0 ? styles.emptyContainer : styles.list}
      data={books}
      keyExtractor={(item) => String(item.id)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyText}>Your library is empty.</Text>
          <Text style={styles.emptyDetail}>Upload a book from the admin panel to see it here.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.row}
          onPress={() => navigation.navigate('Reader', { book: item })}
        >
          <CoverPlaceholder title={item.title} />
          <View style={styles.rowText}>
            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.author} numberOfLines={1}>{item.author}</Text>
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
    alignItems: 'center',
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
  cover: {
    width: 48,
    height: 64,
    borderRadius: 4,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  coverText: { color: '#fff', fontSize: 22, fontWeight: '600' },
  rowText: { flex: 1 },
  title: { fontSize: 16, fontWeight: '600', color: '#111' },
  author: { fontSize: 14, color: '#666', marginTop: 2 },
  errorText: { fontSize: 16, fontWeight: '600', color: '#dc2626', marginBottom: 6 },
  errorDetail: { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 16 },
  retryButton: { backgroundColor: '#2563eb', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 6 },
  retryText: { color: '#fff', fontWeight: '600' },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 4 },
  emptyDetail: { fontSize: 13, color: '#777' },
});
