import { useEffect, useState } from 'react'
import {
  fetchBooks,
  fetchPosts,
  fetchBookPosts,
  createPost,
  updatePost,
  deletePost,
  createBook,
  updateBook,
  deleteBook,
} from './api'
import './App.css'

function formatDate(iso) {
  return new Date(iso).toLocaleString()
}

function truncate(text, max = 120) {
  if (text.length <= max) return text
  return `${text.slice(0, max)}…`
}

function App() {
  const [selectedBookId, setSelectedBookId] = useState(null)

  const [books, setBooks] = useState([])
  const [booksLoading, setBooksLoading] = useState(true)
  const [booksError, setBooksError] = useState(null)

  // Used only to compute the "Posts" count column on the books list —
  // never rendered as a flat, cross-book post list.
  const [allPosts, setAllPosts] = useState([])

  const [posts, setPosts] = useState([])
  const [postsLoading, setPostsLoading] = useState(false)
  const [postsError, setPostsError] = useState(null)

  const [editingId, setEditingId] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const [editingBookId, setEditingBookId] = useState(null)
  const [bookFormTitle, setBookFormTitle] = useState('')
  const [bookFormAuthor, setBookFormAuthor] = useState('')
  const [bookFormDescription, setBookFormDescription] = useState('')
  const [savingBook, setSavingBook] = useState(false)
  const [bookSaveError, setBookSaveError] = useState(null)

  const selectedBook = books.find((b) => b.id === selectedBookId) ?? null

  async function loadBooks() {
    setBooksLoading(true)
    setBooksError(null)
    try {
      setBooks(await fetchBooks())
    } catch (err) {
      setBooksError(err.message)
    } finally {
      setBooksLoading(false)
    }
  }

  async function loadAllPosts() {
    try {
      setAllPosts(await fetchPosts())
    } catch {
      // Non-critical — only affects the post-count column, so fail silently
      // rather than surfacing a second error banner on the books list.
    }
  }

  async function loadPosts(bookId) {
    setPostsLoading(true)
    setPostsError(null)
    try {
      setPosts(await fetchBookPosts(bookId))
    } catch (err) {
      setPostsError(err.message)
    } finally {
      setPostsLoading(false)
    }
  }

  useEffect(() => {
    loadBooks()
    loadAllPosts()
  }, [])

  function postCountFor(id) {
    if (id === selectedBookId) return posts.length
    return allPosts.filter((post) => post.book_id === id).length
  }

  function resetForm() {
    setEditingId(null)
    setTitle('')
    setDescription('')
    setSaveError(null)
  }

  function handleEditClick(post) {
    setEditingId(post.id)
    setTitle(post.title)
    setDescription(post.description)
    setSaveError(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title || !description || selectedBookId == null) return

    setSaving(true)
    setSaveError(null)
    try {
      const payload = { title, description, book_id: selectedBookId }
      if (editingId) {
        await updatePost(editingId, payload)
      } else {
        await createPost(payload)
      }
      resetForm()
      await loadPosts(selectedBookId)
      await loadAllPosts()
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
      await loadPosts(selectedBookId)
      await loadAllPosts()
    } catch (err) {
      alert(err.message)
    }
  }

  function resetBookForm() {
    setEditingBookId(null)
    setBookFormTitle('')
    setBookFormAuthor('')
    setBookFormDescription('')
    setBookSaveError(null)
  }

  function handleBookEditClick(book) {
    setEditingBookId(book.id)
    setBookFormTitle(book.title)
    setBookFormAuthor(book.author || '')
    setBookFormDescription(book.description || '')
    setBookSaveError(null)
  }

  async function handleBookSubmit(e) {
    e.preventDefault()
    if (!bookFormTitle) return

    setSavingBook(true)
    setBookSaveError(null)
    try {
      const payload = {
        title: bookFormTitle,
        author: bookFormAuthor || null,
        description: bookFormDescription || null,
      }
      if (editingBookId) {
        await updateBook(editingBookId, payload)
      } else {
        await createBook(payload)
      }
      resetBookForm()
      await loadBooks()
    } catch (err) {
      setBookSaveError(err.message)
    } finally {
      setSavingBook(false)
    }
  }

  async function handleBookDelete(book) {
    if (!confirm(`Delete "${book.title}"? This cannot be undone.`)) return
    try {
      await deleteBook(book.id)
      if (editingBookId === book.id) resetBookForm()
      await loadBooks()
    } catch (err) {
      alert(err.message)
    }
  }

  function handleSelectBook(book) {
    resetForm()
    setSelectedBookId(book.id)
    loadPosts(book.id)
  }

  function handleBackToBooks() {
    resetForm()
    setSelectedBookId(null)
    setPosts([])
    loadBooks()
    loadAllPosts()
  }

  return (
    <div className="page">
      <h1>BookLibrary Admin</h1>

      {selectedBookId == null && (
        <>
          <section className="panel">
            <h2>{editingBookId ? 'Edit book' : 'New book'}</h2>
            <form className="upload-form" onSubmit={handleBookSubmit}>
              <input
                type="text"
                placeholder="Title"
                value={bookFormTitle}
                onChange={(e) => setBookFormTitle(e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Author (optional)"
                value={bookFormAuthor}
                onChange={(e) => setBookFormAuthor(e.target.value)}
              />
              <textarea
                placeholder="Description (optional)"
                rows={4}
                value={bookFormDescription}
                onChange={(e) => setBookFormDescription(e.target.value)}
              />
              <div className="form-actions">
                <button type="submit" disabled={savingBook}>
                  {savingBook ? 'Saving…' : editingBookId ? 'Update' : 'Add book'}
                </button>
                {editingBookId && (
                  <button
                    type="button"
                    className="secondary"
                    onClick={resetBookForm}
                    disabled={savingBook}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
            {bookSaveError && <p className="error">{bookSaveError}</p>}
          </section>

          <section className="panel">
            <h2>Books ({books.length})</h2>
            {booksLoading && <p>Loading…</p>}
            {booksError && <p className="error">{booksError}</p>}
            {!booksLoading && !booksError && books.length === 0 && <p>No books yet.</p>}
            {!booksLoading && !booksError && books.length > 0 && (
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Author</th>
                    <th>Description</th>
                    <th>Posts</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {books.map((book) => (
                    <tr key={book.id}>
                      <td>
                        <button
                          type="button"
                          className="link-button"
                          onClick={() => handleSelectBook(book)}
                        >
                          {book.title}
                        </button>
                      </td>
                      <td>{book.author || '—'}</td>
                      <td>{book.description ? truncate(book.description) : '—'}</td>
                      <td>{postCountFor(book.id)}</td>
                      <td className="row-actions">
                        <button className="secondary" onClick={() => handleBookEditClick(book)}>
                          Edit
                        </button>
                        <button className="danger" onClick={() => handleBookDelete(book)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}

      {selectedBookId != null && (
        <>
          <button type="button" className="link-button back-link" onClick={handleBackToBooks}>
            ← Back to Books
          </button>
          <h2 className="section-heading">Posts in: {selectedBook?.title ?? `#${selectedBookId}`}</h2>

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
                  <button
                    type="button"
                    className="secondary"
                    onClick={resetForm}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
            {saveError && <p className="error">{saveError}</p>}
          </section>

          <section className="panel">
            <h2>Posts ({posts.length})</h2>
            {postsLoading && <p>Loading…</p>}
            {postsError && <p className="error">{postsError}</p>}
            {!postsLoading && !postsError && posts.length === 0 && <p>No posts yet.</p>}
            {!postsLoading && !postsError && posts.length > 0 && (
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Description</th>
                    <th>Created</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post) => (
                    <tr key={post.id}>
                      <td>{post.title}</td>
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
        </>
      )}
    </div>
  )
}

export default App
