import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getSavedPosts } from '../saved';
import ScreenBackground from '../components/ScreenBackground';
import PostRow from '../components/PostRow';
import { colors, fonts } from '../theme';

// Posts the user bookmarked. Stored on the device, so this works offline.
export default function SavedScreen({ navigation }) {
  const [posts, setPosts] = useState([]);

  // Reload whenever the screen comes into view, so a post saved or removed
  // on the detail screen shows up immediately on return.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      getSavedPosts().then((saved) => {
        if (active) setPosts(saved);
      });
      return () => { active = false; };
    }, []),
  );

  return (
    <ScreenBackground style={styles.container}>
      <FlatList
        contentContainerStyle={posts.length === 0 ? styles.emptyContainer : styles.list}
        data={posts}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>No saved posts yet.</Text>
            <Text style={styles.emptyText}>Tap the bookmark on any post to save it here.</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <PostRow post={item} index={index} onPress={() => navigation.navigate('PostDetail', { post: item })} />
        )}
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 12 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { fontSize: 16, fontFamily: fonts.body, color: colors.textPrimary, marginBottom: 6 },
  emptyText: { fontSize: 14, fontFamily: fonts.bodyMedium, color: colors.textSecondary, textAlign: 'center' },
});
