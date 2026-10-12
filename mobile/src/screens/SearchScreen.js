import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { searchAllPosts } from '../api';
import ScreenBackground from '../components/ScreenBackground';
import PostRow from '../components/PostRow';
import { colors, fonts, radii } from '../theme';

const DEBOUNCE_MS = 400;

// Searches the titles and text of posts in every book at once.
export default function SearchScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | searching | done | error
  const latestRequest = useRef(0);

  useEffect(() => {
    const term = query.trim();
    if (!term) {
      latestRequest.current += 1;
      setResults([]);
      setStatus('idle');
      return undefined;
    }
    const timer = setTimeout(async () => {
      // Drop responses that arrive after a newer search has started.
      const requestId = ++latestRequest.current;
      setStatus('searching');
      try {
        const found = await searchAllPosts(term);
        if (requestId !== latestRequest.current) return;
        setResults(found);
        setStatus('done');
      } catch {
        if (requestId !== latestRequest.current) return;
        setResults([]);
        setStatus('error');
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  let message = null;
  if (status === 'idle') message = 'Search the posts in every book.';
  else if (status === 'error') message = 'Search needs an internet connection.';
  else if (status === 'done' && results.length === 0) message = `No posts found for “${query.trim()}”.`;

  return (
    <ScreenBackground style={styles.container}>
      <View style={styles.searchWrap}>
        <FontAwesome name="search" size={16} color={colors.textMuted} />
        <TextInput
          style={styles.input}
          placeholder="Search all posts..."
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {status === 'searching' && <ActivityIndicator size="small" color={colors.accent} />}
        {status !== 'searching' && query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} accessibilityLabel="Clear search" hitSlop={10}>
            <FontAwesome name="times-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      {message ? (
        <View style={styles.center}>
          <Text style={styles.message}>{message}</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={results}
          keyExtractor={(item) => String(item.id)}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item, index }) => (
            <PostRow post={item} index={index} onPress={() => navigation.navigate('PostDetail', { post: item })} />
          )}
        />
      )}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    margin: 12,
    paddingHorizontal: 14,
    height: 48,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: radii.md,
  },
  input: { flex: 1, fontSize: 16, fontFamily: fonts.bodyMedium, color: colors.textPrimary },
  list: { paddingHorizontal: 12, paddingBottom: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  message: { fontSize: 15, fontFamily: fonts.bodyMedium, color: colors.textSecondary, textAlign: 'center' },
});
