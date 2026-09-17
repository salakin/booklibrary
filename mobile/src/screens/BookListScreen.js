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
import ScreenBackground from '../components/ScreenBackground';
import Button from '../components/Button';
import HexAvatar from '../components/HexAvatar';
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
