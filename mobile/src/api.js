import { API_BASE_URL } from '../config';

export async function fetchBooks() {
  const res = await fetch(`${API_BASE_URL}/api/books`);
  if (!res.ok) throw new Error('Failed to load books');
  return res.json();
}

export async function fetchPosts(bookId, search) {
  const url = search
    ? `${API_BASE_URL}/api/books/${bookId}/posts?search=${encodeURIComponent(search)}`
    : `${API_BASE_URL}/api/books/${bookId}/posts`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to load posts');
  return res.json();
}
