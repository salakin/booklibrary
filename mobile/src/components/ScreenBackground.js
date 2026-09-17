import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';

// Shared plain background wrapper used by every screen so screens don't
// need to repeat the same flex/backgroundColor boilerplate individually.
// Neon Arcade - Light theme: very light lavender canvas.
export default function ScreenBackground({ children, style }) {
  return <View style={[styles.fill, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.background },
});
