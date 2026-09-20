import { useEffect, useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  fetchAllBooks,
  fetchAllBookPosts,
  reorderBooks,
  reorderBookPosts,
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

// Plain CSS glyph rather than an emoji, per project convention — see
// `.drag-handle` in App.css. A dedicated handle (instead of making the
// whole row draggable) so dragging doesn't fight with the book-title link
// or the Edit/Delete buttons in the same row.
function DragHandle(props) {
  return (
    <button type="button" className="drag-handle" aria-label="Drag to reorder" {...props}>
      ⠿
    </button>
  )
}

function SortableBookRow({ book, onSelect, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: book.id,
  })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <tr ref={setNodeRef} style={style} className={isDragging ? 'row-dragging' : undefined}>
      <td className="col-handle">
        <DragHandle {...attributes} {...listeners} />
      </td>
      <td>
        <button type="button" className="link-button" onClick={() => onSelect(book)}>
          {book.title}
        </button>
      </td>
      <td>{book.author || '—'}</td>
      <td>{book.post_count}</td>
      <td className="row-actions">
        <button className="secondary" onClick={() => onEdit(book)}>
          Edit
        </button>
        <button className="danger" onClick={() => onDelete(book)}>
          Delete
        </button>
      </td>
    </tr>
  )
}

function SortablePostRow({ post, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: post.id,
  })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <tr ref={setNodeRef} style={style} className={isDragging ? 'row-dragging' : undefined}>
      <td className="col-handle">
        <DragHandle {...attributes} {...listeners} />
      </td>
      <td>{post.title}</td>
      <td className="col-description">{truncate(post.description)}</td>
      <td>{formatDate(post.created_at)}</td>
      <td className="row-actions">
        <button className="secondary" onClick={() => onEdit(post)}>
          Edit
        </button>
        <button className="danger" onClick={() => onDelete(post)}>
          Delete
        </button>
      </td>
    </tr>
  )
}

function App() {
  const [selectedBookId, setSelectedBookId] = useState(null)

  const [books, setBooks] = useState([])
  const [booksLoading, setBooksLoading] = useState(true)
  const [booksError, setBooksError] = useState(null)
  // The full list, not one page — drag-and-drop reordering needs the
  // complete, ordered id list for the scope being reordered (see
  // `fetchAllBooks` in api.js), so this table no longer pages incrementally.
  const [booksTotal, setBooksTotal] = useState(0)

  const [posts, setPosts] = useState([])
  const [postsLoading, setPostsLoading] = useState(false)
  const [postsError, setPostsError] = useState(null)
  const [postsTotal, setPostsTotal] = useState(0)

  const [editingId, setEditingId] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const [editingBookId, setEditingBookId] = useState(null)
  const [bookFormTitle, setBookFormTitle] = useState('')
  const [bookFormAuthor, setBookFormAuthor] = useState('')
  const [savingBook, setSavingBook] = useState(false)
  const [bookSaveError, setBookSaveError] = useState(null)

  const selectedBook = books.find((b) => b.id === selectedBookId) ?? null

  // Sensors shared by both drag-and-drop tables below. `distance: 5` stops a
  // plain click on the handle (or a click that starts slightly off it) from
  // being read as a drag; keyboard sorting is dnd-kit's built-in a11y path.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // Always reloads the *entire* list — used on mount and after every
  // mutation, matching this panel's existing "re-fetch rather than patch
  // local state" approach. Fetches every row (not one page) because
  // drag-and-drop reorder needs the full, ordered id list for the scope.
  async function loadBooks() {
    setBooksLoading(true)
    setBooksError(null)
    try {
      const { items, total } = await fetchAllBooks()
      setBooks(items)
      setBooksTotal(total)
    } catch (err) {
      setBooksError(err.message)
    } finally {
      setBooksLoading(false)
    }
  }

  async function loadPosts(bookId) {
    setPostsLoading(true)
    setPostsError(null)
    try {
      const { items, total } = await fetchAllBookPosts(bookId)
      setPosts(items)
      setPostsTotal(total)
    } catch (err) {
      setPostsError(err.message)
    } finally {
      setPostsLoading(false)
    }
  }

  useEffect(() => {
    loadBooks()
  }, [])

  // Optimistically reorders the local list on drop, then persists it;
  // reverts and surfaces the error the same way `handleBookDelete`/
  // `handleDelete` below do (a plain `alert`) if the server rejects it.
  async function handleBooksDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = books.findIndex((b) => b.id === active.id)
    const newIndex = books.findIndex((b) => b.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const previous = books
    const reordered = arrayMove(books, oldIndex, newIndex)
    setBooks(reordered)
    try {
      await reorderBooks(reordered.map((b) => b.id))
    } catch (err) {
      setBooks(previous)
      alert(err.message)
    }
  }

  async function handlePostsDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id || selectedBookId == null) return

    const oldIndex = posts.findIndex((p) => p.id === active.id)
    const newIndex = posts.findIndex((p) => p.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const previous = posts
    const reordered = arrayMove(posts, oldIndex, newIndex)
    setPosts(reordered)
    try {
      await reorderBookPosts(selectedBookId, reordered.map((p) => p.id))
    } catch (err) {
      setPosts(previous)
      alert(err.message)
    }
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
    } catch (err) {
      alert(err.message)
    }
  }

  function resetBookForm() {
    setEditingBookId(null)
    setBookFormTitle('')
    setBookFormAuthor('')
    setBookSaveError(null)
  }

  function handleBookEditClick(book) {
    setEditingBookId(book.id)
    setBookFormTitle(book.title)
    setBookFormAuthor(book.author || '')
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
    setPostsTotal(0)
    loadBooks()
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
            <h2>Books ({booksTotal})</h2>
            {booksLoading && <p>Loading…</p>}
            {booksError && <p className="error">{booksError}</p>}
            {!booksLoading && !booksError && books.length === 0 && <p>No books yet.</p>}
            {!booksLoading && !booksError && books.length > 0 && (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleBooksDragEnd}>
                <table>
                  <thead>
                    <tr>
                      <th className="col-handle"></th>
                      <th>Title</th>
                      <th>Author</th>
                      <th>Posts</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    <SortableContext items={books.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                      {books.map((book) => (
                        <SortableBookRow
                          key={book.id}
                          book={book}
                          onSelect={handleSelectBook}
                          onEdit={handleBookEditClick}
                          onDelete={handleBookDelete}
                        />
                      ))}
                    </SortableContext>
                  </tbody>
                </table>
              </DndContext>
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
            <h2>Posts ({postsTotal})</h2>
            {postsLoading && <p>Loading…</p>}
            {postsError && <p className="error">{postsError}</p>}
            {!postsLoading && !postsError && posts.length === 0 && <p>No posts yet.</p>}
            {!postsLoading && !postsError && posts.length > 0 && (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handlePostsDragEnd}>
                <table>
                  <thead>
                    <tr>
                      <th className="col-handle"></th>
                      <th>Title</th>
                      <th className="col-description">Description</th>
                      <th>Created</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    <SortableContext items={posts.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                      {posts.map((post) => (
                        <SortablePostRow
                          key={post.id}
                          post={post}
                          onEdit={handleEditClick}
                          onDelete={handleDelete}
                        />
                      ))}
                    </SortableContext>
                  </tbody>
                </table>
              </DndContext>
            )}
          </section>
        </>
      )}
    </div>
  )
}

export default App
