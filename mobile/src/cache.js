// Minimal last-known-good local cache for offline support. No expiry/TTL —
// just "whatever we last successfully fetched", overwritten on every
// successful live fetch. Backed by AsyncStorage (JSON-serialized).
import AsyncStorage from '@react-native-async-storage/async-storage';

const BOOKS_KEY = 'cache:books';
const postsKey = (bookId) => `cache:posts:${bookId}`;

async function readJSON(key) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    // Corrupt/unavailable storage should behave like "no cache", not crash.
    return null;
  }
}

async function writeJSON(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Best-effort — a failed cache write shouldn't break the live data path.
  }
}

export function getCachedBooks() {
  return readJSON(BOOKS_KEY);
}

export function setCachedBooks(books) {
  return writeJSON(BOOKS_KEY, books);
}

export function getCachedPosts(bookId) {
  return readJSON(postsKey(bookId));
}

export function setCachedPosts(bookId, posts) {
  return writeJSON(postsKey(bookId), posts);
}
