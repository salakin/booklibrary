import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { colors, fonts, radii } from '../theme';

// White card of shortcut buttons. With `overlap` it pulls up over the bottom
// edge of the hero banner above it.
export default function QuickActions({ actions, overlap = 0 }) {
  return (
    <View style={[styles.card, overlap ? { marginTop: -overlap } : null]}>
      {actions.map((a) => (
        <TouchableOpacity
          key={a.label}
          style={styles.action}
          onPress={a.onPress}
          accessibilityRole="button"
          accessibilityLabel={a.label}
        >
          <View style={[styles.iconWrap, { backgroundColor: `${a.color}1F` }]}>
            <FontAwesome name={a.icon} size={22} color={a.color} />
          </View>
          <Text style={styles.label} numberOfLines={1}>{a.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    marginHorizontal: 12,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  action: { flex: 1, alignItems: 'center' },
  iconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  label: { marginTop: 8, fontSize: 14, fontFamily: fonts.bodyMedium, color: colors.textPrimary },
});
