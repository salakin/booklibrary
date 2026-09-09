import { useEffect, useState } from 'react'
import { fetchBooks, uploadBook, deleteBook, fileUrl } from './api'
import './App.css'

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso) {
  return new Date(iso).toLocaleString()
}

function App() {
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)

  async function loadBooks() {
    setLoading(true)
    setError(null)
    try {
      setBooks(await fetchBooks())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBooks()
  }, [])

  async function handleUpload(e) {
    e.preventDefault()
    if (!title || !author || !file) return

    setUploading(true)
    setUploadError(null)
    try {
      await uploadBook({ title, author, file })
      setTitle('')
      setAuthor('')
      setFile(null)
      e.target.reset()
      await loadBooks()
    } catch (err) {
      setUploadError(err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(book) {
    if (!confirm(`Delete "${book.title}"? This cannot be undone.`)) return
    try {
      await deleteBook(book.id)
      await loadBooks()
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className="page">
      <h1>BookLibrary Admin</h1>

      <section className="panel">
        <h2>Upload a book</h2>
        <form className="upload-form" onSubmit={handleUpload}>
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
          <input
            type="file"
            accept=".pdf,.epub"
            onChange={(e) => setFile(e.target.files[0] ?? null)}
            required
          />
          <button type="submit" disabled={uploading}>
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </form>
        {uploadError && <p className="error">{uploadError}</p>}
      </section>

      <section className="panel">
        <h2>Library ({books.length})</h2>
        {loading && <p>Loading…</p>}
        {error && <p className="error">{error}</p>}
        {!loading && !error && books.length === 0 && <p>No books yet.</p>}
        {!loading && !error && books.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Author</th>
                <th>Size</th>
                <th>Uploaded</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {books.map((book) => (
                <tr key={book.id}>
                  <td>
                    <a href={fileUrl(book.id)} target="_blank" rel="noreferrer">
                      {book.title}
                    </a>
                  </td>
                  <td>{book.author}</td>
                  <td>{formatSize(book.file_size_bytes)}</td>
                  <td>{formatDate(book.uploaded_at)}</td>
                  <td>
                    <button className="danger" onClick={() => handleDelete(book)}>
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
