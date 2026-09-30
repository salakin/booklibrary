import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { colors, fonts, radii } from '../theme';

const AUTO_ADVANCE_MS = 4500;
const H_PADDING = 12; // matches the books list's own horizontal padding
const ACCENTS = [colors.purple, colors.magenta, colors.cyan];

// Horizontal, paged, auto-advancing strip of highlighted posts. Renders
// nothing when there are no posts, so callers can pass [] to hide it.
export default function HighlightsSlider({ posts, bookTitles, onPressPost }) {
  const { width } = useWindowDimensions();
  const slideWidth = width - H_PADDING * 2;
  const listRef = useRef(null);
  const indexRef = useRef(0);
  const pausedRef = useRef(false);
  const [index, setIndex] = useState(0);
  const count = posts.length;

  useEffect(() => {
    if (count < 2) return undefined;
    const id = setInterval(() => {
      if (pausedRef.current) return;
      const next = (indexRef.current + 1) % count;
      indexRef.current = next;
      setIndex(next);
      listRef.current?.scrollToOffset({ offset: next * slideWidth, animated: true });
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [count, slideWidth]);

  // Keep the position valid if the list shrinks after a refresh.
  useEffect(() => {
    if (indexRef.current >= count) {
      indexRef.current = 0;
      setIndex(0);
    }
  }, [count]);

  const onScrollEnd = useCallback((e) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / slideWidth);
    indexRef.current = i;
    setIndex(i);
    pausedRef.current = false;
  }, [slideWidth]);

  if (count === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>HIGHLIGHTS</Text>
      <FlatList
        ref={listRef}
        data={posts}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(p) => String(p.id)}
        getItemLayout={(_, i) => ({ length: slideWidth, offset: slideWidth * i, index: i })}
        onScrollBeginDrag={() => { pausedRef.current = true; }}
        onMomentumScrollEnd={onScrollEnd}
        renderItem={({ item, index: i }) => {
          const book = bookTitles?.[item.book_id];
          const accent = ACCENTS[i % ACCENTS.length];
          return (
            <TouchableOpacity
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`Highlighted post: ${item.title}${book ? `, from ${book}` : ''}`}
              style={[styles.slide, { width: slideWidth, borderLeftColor: accent }]}
              onPress={() => onPressPost(item)}
            >
              {!!book && <Text style={[styles.book, { color: accent }]} numberOfLines={1}>{book}</Text>}
              <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.preview} numberOfLines={2}>
                {(item.description || '').replace(/\s+/g, ' ').trim()}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
      {count > 1 && (
        <View style={styles.dots}>
          {posts.map((p, i) => (
            <View key={p.id} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  heading: { fontSize: 12, fontFamily: fonts.heading, color: colors.textSecondary, letterSpacing: 1.5, marginBottom: 8 },
  slide: {
    height: 120,
    padding: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderLeftWidth: 5,
    borderRadius: radii.lg,
    justifyContent: 'center',
  },
  book: { fontSize: 13, fontFamily: fonts.body, marginBottom: 2 },
  title: { fontSize: 15, fontFamily: fonts.headingBold, color: colors.textPrimary, marginBottom: 4 },
  preview: { fontSize: 14, fontFamily: fonts.bodyMedium, color: colors.textSecondary },
  dots: { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.surfaceBorder, marginHorizontal: 3 },
  dotActive: { width: 18, backgroundColor: colors.magenta },
});
