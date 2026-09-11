import { useEffect, useState } from 'react'
import { fetchPosts, createPost, deletePost } from './api'
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

  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState(null)

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

  async function handleCreate(e) {
    e.preventDefault()
    if (!title || !author || !description) return

    setCreating(true)
    setCreateError(null)
    try {
      await createPost({ title, author, description })
      setTitle('')
      setAuthor('')
      setDescription('')
      await loadPosts()
    } catch (err) {
      setCreateError(err.message)
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(post) {
    if (!confirm(`Delete "${post.title}"? This cannot be undone.`)) return
    try {
      await deletePost(post.id)
      await loadPosts()
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className="page">
      <h1>BookLibrary Admin</h1>

      <section className="panel">
        <h2>New post</h2>
        <form className="upload-form" onSubmit={handleCreate}>
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
          <button type="submit" disabled={creating}>
            {creating ? 'Posting…' : 'Post'}
          </button>
        </form>
        {createError && <p className="error">{createError}</p>}
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
                  <td>
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
