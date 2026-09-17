import { ScrollView, StyleSheet, Text, View } from 'react-native';
import ScreenBackground from '../components/ScreenBackground';
import { colors } from '../theme';

export default function PostDetailScreen({ route }) {
  const { post } = route.params;

  return (
    <ScreenBackground>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>{post.title}</Text>
        <View style={styles.divider} />
        <Text style={styles.description}>{post.description}</Text>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  title: { fontSize: 24, fontWeight: '700', color: colors.textPrimary },
  divider: { height: 1, backgroundColor: colors.surfaceBorder, marginTop: 10, marginBottom: 16 },
  description: { fontSize: 16, lineHeight: 24, color: colors.textPrimary },
});
