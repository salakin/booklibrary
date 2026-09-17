const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export async function fetchBooks() {
  const res = await fetch(`${API_BASE_URL}/api/books`)
  if (!res.ok) throw new Error('Failed to fetch books')
  return res.json()
}

export async function createBook({ title, author, description }) {
  const res = await fetch(`${API_BASE_URL}/api/books`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, author, description }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || 'Failed to create book')
  }
  return res.json()
}

export async function updateBook(id, { title, author, description }) {
  const res = await fetch(`${API_BASE_URL}/api/books/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, author, description }),
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

export async function fetchPosts() {
  const res = await fetch(`${API_BASE_URL}/api/posts`)
  if (!res.ok) throw new Error('Failed to fetch posts')
  return res.json()
}

export async function fetchBookPosts(bookId, search) {
  const url = new URL(`${API_BASE_URL}/api/books/${bookId}/posts`)
  if (search) url.searchParams.set('search', search)
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
