import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { colors, fonts, radii } from '../theme';

// Shared primary call-to-action button (Welcome screen CTA, error retry,
// etc): multi-color brand gradient pill, white bold uppercase text, soft
// green-tinted shadow, optional trailing icon.
export default function Button({ onPress, children, style, textStyle, icon }) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[styles.shadowWrap, style]}>
      <LinearGradient
        colors={colors.gradientPrimary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.button}
      >
        <Text style={[styles.text, textStyle]}>{children}</Text>
        {!!icon && <FontAwesome name={icon} size={16} color={colors.white} style={styles.icon} />}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    borderRadius: radii.pill,
    shadowColor: colors.shadowBrand,
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  button: {
    flexDirection: 'row',
    paddingVertical: 15,
    paddingHorizontal: 36,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: colors.white,
    fontSize: 16,
    // A bold family rather than fontWeight: Android falls back to the system
    // font when a weight is layered on a custom family.
    fontFamily: fonts.headingBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  icon: { marginLeft: 10 },
});
