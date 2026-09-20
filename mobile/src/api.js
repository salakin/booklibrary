import { API_BASE_URL } from '../config';

// Matches the API's own default page size. Big enough to more than fill a
// phone screen (so `onEndReached` isn't re-firing on every flick) and small
// enough that the first screenful of a long list arrives quickly.
export const PAGE_SIZE = 20;

function pageQuery(limit, offset) {
  return `limit=${limit}&offset=${offset}`;
}

// Both list endpoints answer with an envelope, not a bare array:
//   { items: [...], total, limit, offset, has_more }
// `has_more` is what drives infinite scroll; `total` is available for counts.
export async function fetchBooks({ limit = PAGE_SIZE, offset = 0 } = {}) {
  const res = await fetch(`${API_BASE_URL}/api/books?${pageQuery(limit, offset)}`);
  if (!res.ok) throw new Error('Failed to load books');
  return res.json();
}

export async function fetchPosts(bookId, search, { limit = PAGE_SIZE, offset = 0 } = {}) {
  const query = search
    ? `${pageQuery(limit, offset)}&search=${encodeURIComponent(search)}`
    : pageQuery(limit, offset);
  const res = await fetch(`${API_BASE_URL}/api/books/${bookId}/posts?${query}`);
  if (!res.ok) throw new Error('Failed to load posts');
  return res.json();
}
