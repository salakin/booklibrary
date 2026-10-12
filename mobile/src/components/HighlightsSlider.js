import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { colors, fonts } from '../theme';

const HERO_HEIGHT = 260;
// Long descriptions scroll inside the banner instead of growing it.
const MAX_TEXT_HEIGHT = 150;
// After the user swipes or scrolls a slide, wait this long before resuming.
const RESUME_AFTER_MS = 8000;

// Each slide stays up long enough to actually read its full description.
function dwellFor(post) {
  const length = (post?.description || '').length;
  return Math.min(15000, Math.max(4500, length * 50));
}

const BUILDINGS = [
  [0, 60, 30, 30], [32, 48, 22, 42], [56, 66, 26, 24], [84, 40, 18, 50], [104, 58, 30, 32],
  [266, 58, 30, 32], [298, 40, 18, 50], [318, 66, 26, 24], [346, 48, 22, 42], [370, 60, 30, 30],
];
const COLUMNS = [158, 173, 188, 204, 219, 234];

// Faint courthouse-and-city skyline along the bottom of the banner.
function Skyline({ width, bottom }) {
  const height = (width * 90) / 400;
  return (
    <Svg width={width} height={height} viewBox="0 0 400 90" style={[styles.skyline, { bottom }]} pointerEvents="none">
      {BUILDINGS.map(([x, y, w, h]) => (
        <Rect key={x} x={x} y={y} width={w} height={h} fill={colors.white} fillOpacity={0.1} />
      ))}
      <Path d="M150 34 L200 12 L250 34 Z" fill={colors.white} fillOpacity={0.14} />
      <Rect x={150} y={34} width={100} height={6} fill={colors.white} fillOpacity={0.14} />
      {COLUMNS.map((x) => (
        <Rect key={x} x={x} y={42} width={8} height={34} fill={colors.white} fillOpacity={0.14} />
      ))}
      <Rect x={148} y={76} width={104} height={6} fill={colors.white} fillOpacity={0.14} />
      <Rect x={140} y={82} width={120} height={8} fill={colors.white} fillOpacity={0.14} />
    </Svg>
  );
}

// Full-width, auto-advancing hero banner of highlighted posts: each slide is
// the post's full description as a centered quote, with its book as the
// source line. Renders nothing when there are no posts. `overlap` is how far
// something below (the shortcut card) covers the banner's bottom edge; the
// banner grows by that much and keeps its dots and skyline above it.
export default function HighlightsSlider({ posts, bookTitles, onPressPost, overlap = 0 }) {
  const heroHeight = HERO_HEIGHT + overlap;
  const { width } = useWindowDimensions();
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
      listRef.current?.scrollToOffset({ offset: next * width, animated: true });
    }, delay);
  }, [count, width]);

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
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i === indexRef.current) {
      // Swiped back to the same slide: the index effect won't rerun.
      schedule(RESUME_AFTER_MS);
      return;
    }
    interactedRef.current = true;
    indexRef.current = i;
    setIndex(i);
  }, [width, schedule]);

  if (count === 0) return null;

  return (
    <View style={[styles.hero, { height: heroHeight }, overlap ? { marginBottom: 0 } : null]}>
      <Skyline width={width} bottom={overlap} />
      <FlatList
        ref={listRef}
        data={posts}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(p) => String(p.id)}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onScrollBeginDrag={pause}
        onMomentumScrollEnd={onScrollEnd}
        renderItem={({ item }) => {
          const book = bookTitles?.[item.book_id];
          return (
            <TouchableOpacity
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`Highlighted post: ${item.title}${book ? `, from ${book}` : ''}`}
              style={[styles.slide, { width, height: heroHeight, paddingBottom: 36 + overlap }]}
              onPress={() => onPressPost(item)}
            >
              <ScrollView
                style={styles.textScroll}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
                onScrollBeginDrag={pause}
                onScrollEndDrag={() => schedule(RESUME_AFTER_MS)}
              >
                <Text style={styles.quote}>{`“${(item.description || '').trim()}”`}</Text>
              </ScrollView>
              {!!book && <Text style={styles.source} numberOfLines={1}>{`[${book}]`}</Text>}
            </TouchableOpacity>
          );
        }}
      />
      {count > 1 && (
        <View style={[styles.dots, { bottom: 12 + overlap }]} pointerEvents="none">
          {posts.map((p, i) => (
            <View key={p.id} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Only the bottom corners round; the top joins the header seamlessly.
  hero: {
    height: HERO_HEIGHT,
    backgroundColor: colors.hero,
    overflow: 'hidden',
    marginBottom: 12,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  skyline: { position: 'absolute', left: 0, bottom: 0 },
  slide: {
    height: HERO_HEIGHT,
    paddingHorizontal: 28,
    paddingTop: 12,
    paddingBottom: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // flexGrow 0: ScrollView fills its parent by default, which would push the
  // source line to the bottom instead of keeping quote + source centered.
  textScroll: { flexGrow: 0, maxHeight: MAX_TEXT_HEIGHT },
  quote: { fontSize: 16, lineHeight: 26, fontFamily: fonts.bodyMedium, color: colors.white, textAlign: 'center' },
  source: { fontSize: 14, fontFamily: fonts.bodyMedium, color: colors.white, opacity: 0.85, marginTop: 14 },
  dots: { position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)', marginHorizontal: 3 },
  dotActive: { width: 18, backgroundColor: colors.white },
});
