import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import ScreenBackground from '../components/ScreenBackground';
import { colors, fonts } from '../theme';

export default function PostDetailScreen({ route }) {
  const { post } = route.params;

  return (
    <ScreenBackground>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>{post.title}</Text>
        <LinearGradient
          colors={colors.gradientUnderline}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.underline}
        />
        <View style={styles.divider} />
        <Text style={styles.description}>{post.description}</Text>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  title: { fontSize: 24, fontFamily: fonts.heading, color: colors.textPrimary },
  underline: {
    width: 48,
    height: 4,
    borderRadius: 2,
    marginTop: 10,
  },
  divider: { height: 1, backgroundColor: colors.surfaceBorder, marginTop: 16, marginBottom: 16 },
  description: { fontSize: 17, fontFamily: fonts.bodyMedium, lineHeight: 25, color: colors.textPrimary },
});
