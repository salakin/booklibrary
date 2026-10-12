// User bookmarks, stored on the device. Whole post objects are kept (not just
// ids) so a saved post can be opened offline. Most recently saved first.
import AsyncStorage from '@react-native-async-storage/async-storage';

const SAVED_KEY = 'saved:posts';

export async function getSavedPosts() {
  try {
    const raw = await AsyncStorage.getItem(SAVED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function isPostSaved(postId) {
  const saved = await getSavedPosts();
  return saved.some((p) => p.id === postId);
}

// Saves the post if it isn't saved, removes it if it is. Returns whether the
// post is saved afterwards.
export async function toggleSavedPost(post) {
  const saved = await getSavedPosts();
  const alreadySaved = saved.some((p) => p.id === post.id);
  const next = alreadySaved ? saved.filter((p) => p.id !== post.id) : [post, ...saved];
  await AsyncStorage.setItem(SAVED_KEY, JSON.stringify(next));
  return !alreadySaved;
}
