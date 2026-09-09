const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export async function fetchBooks() {
  const res = await fetch(`${API_BASE_URL}/api/books`)
  if (!res.ok) throw new Error('Failed to fetch books')
  return res.json()
}

export async function uploadBook({ title, author, file }) {
  const formData = new FormData()
  formData.append('title', title)
  formData.append('author', author)
  formData.append('file', file)

  const res = await fetch(`${API_BASE_URL}/api/books`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || 'Failed to upload book')
  }
  return res.json()
}

export async function deleteBook(id) {
  const res = await fetch(`${API_BASE_URL}/api/books/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete book')
}

export function fileUrl(id) {
  return `${API_BASE_URL}/api/books/${id}/file`
}
