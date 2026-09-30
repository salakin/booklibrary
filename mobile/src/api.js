import { API_BASE_URL } from '../config';

// Server enforces this as the largest page it will hand back in one request
// (`MAX_PAGE_SIZE` in api/main.py) — the chunk size `fetchBooks`/`fetchPosts`
// below page through internally to assemble the full list.
const MAX_LIMIT = 100;

function pageQuery(limit, offset) {
  return `limit=${limit}&offset=${offset}`;
}

// Both list endpoints answer with an envelope, not a bare array:
//   { items: [...], total, limit, offset, has_more }
async function fetchBooksPage({ offset = 0 } = {}) {
  const res = await fetch(`${API_BASE_URL}/api/books?${pageQuery(MAX_LIMIT, offset)}`);
  if (!res.ok) throw new Error('Failed to load books');
  return res.json();
}

async function fetchPostsPage(bookId, search, { offset = 0 } = {}) {
  const query = search
    ? `${pageQuery(MAX_LIMIT, offset)}&search=${encodeURIComponent(search)}`
    : pageQuery(MAX_LIMIT, offset);
  const res = await fetch(`${API_BASE_URL}/api/books/${bookId}/posts?${query}`);
  if (!res.ok) throw new Error('Failed to load posts');
  return res.json();
}

// The screens no longer page/infinite-scroll — they want every row up
// front. This walks every server page at the server's max page size and
// concatenates them into one flat array.
export async function fetchBooks() {
  let offset = 0;
  let items = [];
  for (;;) {
    const page = await fetchBooksPage({ offset });
    items = items.concat(page.items);
    offset += page.items.length;
    if (!page.has_more || page.items.length === 0) break;
  }
  return items;
}

export async function fetchPosts(bookId, search) {
  let offset = 0;
  let items = [];
  for (;;) {
    const page = await fetchPostsPage(bookId, search, { offset });
    items = items.concat(page.items);
    offset += page.items.length;
    if (!page.has_more || page.items.length === 0) break;
  }
  return items;
}

// Newest posts across every book, newest first. The flat `GET /api/posts`
// route is unpaginated and ordered by `created_at DESC` (not the manual
// `position` order the per-book routes use), so the first `count` entries are
// exactly the latest posts — no dedicated endpoint needed.
export async function fetchLatestPosts(count = 5) {
  const res = await fetch(`${API_BASE_URL}/api/posts`);
  if (!res.ok) throw new Error('Failed to load latest posts');
  const all = await res.json();
  return all.slice(0, count);
}
