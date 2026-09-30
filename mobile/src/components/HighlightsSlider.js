import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { colors, fonts, radii } from '../theme';

const H_PADDING = 12; // matches the books list's own horizontal padding
const ACCENTS = [colors.purple, colors.magenta, colors.cyan];
// Long descriptions scroll inside the card instead of growing the slider.
const MAX_TEXT_HEIGHT = 200;
// After the user swipes or scrolls a card, wait this long before resuming.
const RESUME_AFTER_MS = 8000;

// Each slide stays up long enough to actually read its full description.
function dwellFor(post) {
  const length = (post?.description || '').length;
  return Math.min(15000, Math.max(4500, length * 50));
}

// Horizontal, paged, auto-advancing strip of highlighted posts showing each
// post's full description. Renders nothing when there are no posts, so
// callers can pass [] to hide it.
export default function HighlightsSlider({ posts, onPressPost }) {
  const { width } = useWindowDimensions();
  const slideWidth = width - H_PADDING * 2;
  const listRef = useRef(null);
  const indexRef = useRef(0);
  const timerRef = useRef(null);
  const interactedRef = useRef(false);
  const [index, setIndex] = useState(0);
  const count = posts.length;

  const schedule = useCallback((delay) => {
    clearTimeout(timerRef.current);
    if (count < 2) return;
    timerRef.current = setTimeout(() => {
      const next = (indexRef.current + 1) % count;
      indexRef.current = next;
      setIndex(next);
      listRef.current?.scrollToOffset({ offset: next * slideWidth, animated: true });
    }, delay);
  }, [count, slideWidth]);

  const pause = useCallback(() => {
    clearTimeout(timerRef.current);
  }, []);

  // Reschedule whenever the visible slide changes: a longer wait if the user
  // just interacted, otherwise the new slide's reading time.
  useEffect(() => {
    const delay = interactedRef.current ? RESUME_AFTER_MS : dwellFor(posts[index]);
    interactedRef.current = false;
    schedule(delay);
    return () => clearTimeout(timerRef.current);
  }, [index, posts, schedule]);

  // Keep the position valid if the list shrinks after a refresh.
  useEffect(() => {
    if (indexRef.current >= count) {
      indexRef.current = 0;
      setIndex(0);
    }
  }, [count]);

  const onScrollEnd = useCallback((e) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / slideWidth);
    if (i === indexRef.current) {
      // Swiped back to the same slide: the index effect won't rerun.
      schedule(RESUME_AFTER_MS);
      return;
    }
    interactedRef.current = true;
    indexRef.current = i;
    setIndex(i);
  }, [slideWidth, schedule]);

  if (count === 0) return null;

  return (
    <View style={styles.wrap}>
      <FlatList
        ref={listRef}
        data={posts}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(p) => String(p.id)}
        getItemLayout={(_, i) => ({ length: slideWidth, offset: slideWidth * i, index: i })}
        onScrollBeginDrag={pause}
        onMomentumScrollEnd={onScrollEnd}
        renderItem={({ item, index: i }) => (
          <TouchableOpacity
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`Highlighted post: ${item.title}`}
            style={[styles.slide, { width: slideWidth, borderLeftColor: ACCENTS[i % ACCENTS.length] }]}
            onPress={() => onPressPost(item)}
          >
            <ScrollView
              style={styles.textScroll}
              contentContainerStyle={styles.textScrollContent}
              nestedScrollEnabled
              showsVerticalScrollIndicator
              onScrollBeginDrag={pause}
              onScrollEndDrag={() => schedule(RESUME_AFTER_MS)}
            >
              <Text style={styles.description}>{(item.description || '').trim()}</Text>
            </ScrollView>
          </TouchableOpacity>
        )}
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
  slide: {
    minHeight: 80,
    padding: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderLeftWidth: 5,
    borderRadius: radii.lg,
  },
  textScroll: { maxHeight: MAX_TEXT_HEIGHT },
  // Cards stretch to the tallest one in the row; centering inside the
  // scroll content keeps short descriptions from sitting above empty space.
  textScrollContent: { flexGrow: 1, justifyContent: 'center' },
  description: { fontSize: 15, fontFamily: fonts.bodyMedium, color: colors.textPrimary, lineHeight: 22 },
  dots: { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.surfaceBorder, marginHorizontal: 3 },
  dotActive: { width: 18, backgroundColor: colors.magenta },
});
