import { StyleSheet, Text, View } from 'react-native';
import { fonts, radii } from '../theme';

// Small, unobtrusive indicator shown when a screen is displaying
// last-known-good cached data because a live refresh failed (offline, dev
// server unreachable, etc). Not an error state — the list underneath is
// still fully usable.
export default function OfflineBanner({ style }) {
  return (
    <View style={[styles.banner, style]}>
      <Text style={styles.text}>Offline — showing saved data</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 12,
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    backgroundColor: '#FFF4E1',
    borderWidth: 1,
    borderColor: '#F0C879',
  },
  text: {
    fontSize: 13,
    fontFamily: fonts.bodyMedium,
    color: '#8A5A00',
    textAlign: 'center',
  },
});
