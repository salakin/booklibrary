const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export async function fetchPosts() {
  const res = await fetch(`${API_BASE_URL}/api/posts`)
  if (!res.ok) throw new Error('Failed to fetch posts')
  return res.json()
}

export async function createPost({ title, author, description }) {
  const res = await fetch(`${API_BASE_URL}/api/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, author, description }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || 'Failed to create post')
  }
  return res.json()
}

export async function updatePost(id, { title, author, description }) {
  const res = await fetch(`${API_BASE_URL}/api/posts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, author, description }),
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
