import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fonts, radii } from '../theme';

function truncate(text, max = 100) {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

// A post in a list: colored initial avatar, title, and a two-line preview.
export default function PostRow({ post, index, onPress }) {
  const initial = post.title?.trim()?.charAt(0)?.toUpperCase() || '?';
  const { bg, fg } = colors.avatarPalette[index % colors.avatarPalette.length];
  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <View style={[styles.avatar, { backgroundColor: bg }]}>
        <Text style={[styles.avatarLabel, { color: fg }]}>{initial}</Text>
      </View>
      <View style={styles.rowText}>
        <Text style={styles.title} numberOfLines={1}>{post.title}</Text>
        <Text style={styles.preview} numberOfLines={2}>{truncate(post.description)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    padding: 12,
    marginBottom: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: radii.md,
    shadowColor: colors.shadowPurple,
    shadowOpacity: 1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    marginRight: 14,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: { fontFamily: fonts.heading, fontSize: 18 },
  rowText: { flex: 1 },
  title: { fontSize: 16, fontFamily: fonts.body, color: colors.textPrimary },
  preview: { fontSize: 14, fontFamily: fonts.bodyMedium, color: colors.textMuted, marginTop: 4 },
});
