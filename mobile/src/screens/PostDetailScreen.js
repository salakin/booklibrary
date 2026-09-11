import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function PostDetailScreen({ route }) {
  const { post } = route.params;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{post.title}</Text>
      <Text style={styles.author}>by {post.author}</Text>
      <View style={styles.divider} />
      <Text style={styles.description}>{post.description}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20 },
  title: { fontSize: 24, fontWeight: '700', color: '#111' },
  author: { fontSize: 15, color: '#666', marginTop: 6 },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 16 },
  description: { fontSize: 16, lineHeight: 24, color: '#222' },
});
