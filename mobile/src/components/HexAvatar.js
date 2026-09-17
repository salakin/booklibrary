import { useId } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, {
  ClipPath,
  Defs,
  Image as SvgImage,
  LinearGradient as SvgLinearGradient,
  Polygon,
  Stop,
} from 'react-native-svg';
import { colors, fonts } from '../theme';

// Hexagon points for a circle of radius `r` centered at (cx, cy), normalized
// to an SVG coordinate space. Pointy-top hexagon (rotated 90deg from
// flat-top) reads better at small avatar sizes and matches the mockup's
// badge silhouette.
function hexPointsAt(cx, cy, r) {
  const points = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 90);
    points.push(`${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`);
  }
  return points.join(' ');
}

// Reusable hexagon badge, rendered as a real SVG polygon since RN's
// `clipPath` style is unreliable across platforms. Two modes:
//  - icon/letter mode (default): full hexagon filled with a magenta->purple
//    gradient, with a letter or icon centered on top (book/post avatars).
//  - photo mode (`imageSource` prop): the gradient hexagon becomes a thin
//    frame/ring, and the image is clipped to a smaller concentric hexagon
//    using `<ClipPath>` + `<Image>`, so a real photo reads as hexagon-framed
//    artwork instead of a plain rounded-rect (used for the Welcome logo).
export default function HexAvatar({
  size = 44,
  label,
  children,
  imageSource,
  frameWidth = 6,
  colorsFrom = colors.magenta,
  colorsTo = colors.purple,
  textSize,
  style,
}) {
  // Unique per-instance ids so multiple hexagons on the same screen (list
  // rows) don't collide on shared <Defs> ids.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const gradId = `hexGrad-${uid}`;
  const clipId = `hexClip-${uid}`;
  const fontSize = textSize ?? Math.round(size * 0.4);
  const cx = size / 2;
  const cy = size / 2;
  const innerR = imageSource ? size / 2 - frameWidth : size / 2;

  return (
    <View style={[{ width: size, height: size }, styles.wrap, style]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgLinearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={colorsFrom} />
            <Stop offset="100%" stopColor={colorsTo} />
          </SvgLinearGradient>
          {!!imageSource && (
            <ClipPath id={clipId}>
              <Polygon points={hexPointsAt(cx, cy, innerR)} />
            </ClipPath>
          )}
        </Defs>
        {/* Gradient hexagon — full badge fill in icon/letter mode, or a
            frame/ring behind the clipped photo in photo mode. */}
        <Polygon points={hexPointsAt(cx, cy, size / 2)} fill={`url(#${gradId})`} />
        {!!imageSource && (
          <SvgImage
            x={cx - innerR}
            y={cy - innerR}
            width={innerR * 2}
            height={innerR * 2}
            href={imageSource}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#${clipId})`}
          />
        )}
      </Svg>
      {!imageSource && (
        <View style={styles.content} pointerEvents="none">
          {children ?? <Text style={[styles.label, { fontSize }]}>{label}</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: colors.white,
    fontFamily: fonts.heading,
  },
});
