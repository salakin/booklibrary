import { useEffect, useState } from 'react'
import { fetchPosts, createPost, updatePost, deletePost } from './api'
import './App.css'

function formatDate(iso) {
  return new Date(iso).toLocaleString()
}

function truncate(text, max = 120) {
  if (text.length <= max) return text
  return `${text.slice(0, max)}…`
}

function App() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [editingId, setEditingId] = useState(null)
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  async function loadPosts() {
    setLoading(true)
    setError(null)
    try {
      setPosts(await fetchPosts())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPosts()
  }, [])

  function resetForm() {
    setEditingId(null)
    setTitle('')
    setAuthor('')
    setDescription('')
    setSaveError(null)
  }

  function handleEditClick(post) {
    setEditingId(post.id)
    setTitle(post.title)
    setAuthor(post.author)
    setDescription(post.description)
    setSaveError(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title || !author || !description) return

    setSaving(true)
    setSaveError(null)
    try {
      if (editingId) {
        await updatePost(editingId, { title, author, description })
      } else {
        await createPost({ title, author, description })
      }
      resetForm()
      await loadPosts()
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(post) {
    if (!confirm(`Delete "${post.title}"? This cannot be undone.`)) return
    try {
      await deletePost(post.id)
      if (editingId === post.id) resetForm()
      await loadPosts()
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className="page">
      <h1>BookLibrary Admin</h1>

      <section className="panel">
        <h2>{editingId ? 'Edit post' : 'New post'}</h2>
        <form className="upload-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Author"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            required
          />
          <textarea
            placeholder="Description"
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
          <div className="form-actions">
            <button type="submit" disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Update' : 'Post'}
            </button>
            {editingId && (
              <button type="button" className="secondary" onClick={resetForm} disabled={saving}>
                Cancel
              </button>
            )}
          </div>
        </form>
        {saveError && <p className="error">{saveError}</p>}
      </section>

      <section className="panel">
        <h2>Posts ({posts.length})</h2>
        {loading && <p>Loading…</p>}
        {error && <p className="error">{error}</p>}
        {!loading && !error && posts.length === 0 && <p>No posts yet.</p>}
        {!loading && !error && posts.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Author</th>
                <th>Description</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id}>
                  <td>{post.title}</td>
                  <td>{post.author}</td>
                  <td>{truncate(post.description)}</td>
                  <td>{formatDate(post.created_at)}</td>
                  <td className="row-actions">
                    <button className="secondary" onClick={() => handleEditClick(post)}>
                      Edit
                    </button>
                    <button className="danger" onClick={() => handleDelete(post)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}

export default App
