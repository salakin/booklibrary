import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { colors, radii } from '../theme';

// Shared solid accent-colored button used anywhere the app needs a primary
// call-to-action (Welcome screen CTA, error retry, etc).
export default function Button({ onPress, children, style, textStyle }) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[styles.button, style]}>
      <Text style={[styles.text, textStyle]}>{children}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { color: colors.white, fontSize: 16, fontWeight: '600' },
});
