import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { colors, fonts, radii } from '../theme';

// Shared primary call-to-action button (Welcome screen CTA, error retry,
// etc). Neon Arcade - Light theme: magenta->purple gradient fill, white
// bold uppercase text, soft magenta-tinted shadow.
export default function Button({ onPress, children, style, textStyle }) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[styles.shadowWrap, style]}>
      <LinearGradient
        colors={colors.gradientPrimary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.button}
      >
        <Text style={[styles.text, textStyle]}>{children}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    borderRadius: radii.sm,
    shadowColor: colors.shadowMagenta,
    shadowOpacity: 1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: colors.white,
    fontSize: 16,
    fontFamily: fonts.body,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
