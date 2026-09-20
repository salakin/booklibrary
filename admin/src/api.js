const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

// The list endpoints are paginated and the API caps `limit` at 100. 50 suits a
// desktop table: few enough to keep the response small, large enough that most
// libraries fit in one request and the "Load more" button never appears.
export const PAGE_SIZE = 50

// Both list endpoints answer with `{ items, total, limit, offset, has_more }`
// rather than a bare array — callers read `total` for counts (it describes the
// whole result set, not the page) and `has_more` to decide whether to offer
// another page.
export async function fetchBooks({ limit = PAGE_SIZE, offset = 0 } = {}) {
  const url = new URL(`${API_BASE_URL}/api/books`)
  url.searchParams.set('limit', limit)
  url.searchParams.set('offset', offset)
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch books')
  return res.json()
}

export async function createBook({ title, author }) {
  const res = await fetch(`${API_BASE_URL}/api/books`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, author }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || 'Failed to create book')
  }
  return res.json()
}

export async function updateBook(id, { title, author }) {
  const res = await fetch(`${API_BASE_URL}/api/books/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, author }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || 'Failed to update book')
  }
  return res.json()
}

export async function deleteBook(id) {
  const res = await fetch(`${API_BASE_URL}/api/books/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || 'Failed to delete book')
  }
}

// Server-enforced cap on `limit`, used as the page size when paging through
// an entire list (see `fetchAllPages` below) rather than a single page.
const FETCH_ALL_PAGE_SIZE = 100

// Loops a paginated fetcher until `has_more` is false, accumulating every
// page's items. Reordering needs the complete, ordered id list for its
// scope (see `reorderBooks`/`reorderBookPosts` below) — a single page isn't
// enough once a book/post list grows past one page — and looping rather
// than trusting one large `limit` keeps working no matter how many rows
// exist, since the server caps `limit` at 100 regardless of what's asked.
async function fetchAllPages(fetchPage) {
  let offset = 0
  let items = []
  let total = 0
  for (;;) {
    const page = await fetchPage(offset)
    items = items.concat(page.items)
    total = page.total
    if (!page.has_more) break
    offset = items.length
  }
  return { items, total }
}

export async function fetchAllBooks() {
  return fetchAllPages((offset) => fetchBooks({ limit: FETCH_ALL_PAGE_SIZE, offset }))
}

export async function reorderBooks(ids) {
  const res = await fetch(`${API_BASE_URL}/api/books/reorder`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || 'Failed to save the new book order')
  }
  return res.json()
}

// The flat `GET /api/posts` wrapper used to live here purely to feed the books
// table's post-count column. That count now arrives as `post_count` on each
// book, so nothing needs to download every post in the system any more.
export async function fetchBookPosts(bookId, { search, limit = PAGE_SIZE, offset = 0 } = {}) {
  const url = new URL(`${API_BASE_URL}/api/books/${bookId}/posts`)
  if (search) url.searchParams.set('search', search)
  url.searchParams.set('limit', limit)
  url.searchParams.set('offset', offset)
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch posts for book')
  return res.json()
}

export async function createPost({ title, description, book_id }) {
  const res = await fetch(`${API_BASE_URL}/api/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description, book_id }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || 'Failed to create post')
  }
  return res.json()
}

export async function updatePost(id, { title, description, book_id }) {
  const res = await fetch(`${API_BASE_URL}/api/posts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description, book_id }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || 'Failed to update post')
  }
  return res.json()
}

export async function deletePost(id) {
  const res = await fetch(`${API_BASE_URL}/api/posts/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete post')
}

export async function fetchAllBookPosts(bookId, { search } = {}) {
  return fetchAllPages((offset) => fetchBookPosts(bookId, { search, limit: FETCH_ALL_PAGE_SIZE, offset }))
}

export async function reorderBookPosts(bookId, ids) {
  const res = await fetch(`${API_BASE_URL}/api/books/${bookId}/posts/reorder`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || 'Failed to save the new post order')
  }
  return res.json()
}
