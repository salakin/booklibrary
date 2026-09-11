import { API_BASE_URL } from '../config';

export async function fetchPosts() {
  const res = await fetch(`${API_BASE_URL}/api/posts`);
  if (!res.ok) throw new Error('Failed to load posts');
  return res.json();
}
