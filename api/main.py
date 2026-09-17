from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, or_, text
from sqlalchemy.orm import Session

import models
import schemas
from database import Base, SessionLocal, engine, get_db

Base.metadata.create_all(bind=engine)

# Default Book that pre-existing posts get filed under. This project has no
# Alembic (see README/CLAUDE.md) and `Base.metadata.create_all()` only
# creates missing tables — it never alters an existing `posts` table, so
# adding a NOT NULL `book_id` foreign key straight into the model would
# leave any already-deployed database (local SQLite or the live Neon
# Postgres instance) with a `posts` table that has no such column at all.
DEFAULT_BOOK_TITLE = "Lawbook Library"


def _migrate_existing_posts_to_books():
    """One-time startup backfill for databases that predate the Book model.

    Safe to run on every startup (no-ops once already applied):
    1. If `posts` doesn't exist yet, this is a brand new DB — `create_all`
       already created it with `book_id NOT NULL`, nothing to do.
    2. If `posts` exists but has no `book_id` column, add it as a plain
       nullable column via raw ALTER TABLE (adding a NOT NULL column to a
       non-empty table fails on SQLite, and would leave existing rows with
       no value to satisfy it on Postgres either).
    3. If any posts have a NULL `book_id` (i.e. they existed before this
       migration), create the default Book (once) and point them at it, so
       no existing post is lost or orphaned.
    """
    inspector = inspect(engine)
    if "posts" not in inspector.get_table_names():
        return

    columns = {col["name"] for col in inspector.get_columns("posts")}
    if "book_id" not in columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE posts ADD COLUMN book_id INTEGER"))

    db = SessionLocal()
    try:
        orphaned = db.query(models.Post).filter(models.Post.book_id.is_(None))
        if orphaned.count() == 0:
            return

        default_book = (
            db.query(models.Book).filter(models.Book.title == DEFAULT_BOOK_TITLE).first()
        )
        if default_book is None:
            default_book = models.Book(title=DEFAULT_BOOK_TITLE)
            db.add(default_book)
            db.commit()
            db.refresh(default_book)

        orphaned.update({models.Post.book_id: default_book.id}, synchronize_session=False)
        db.commit()
    finally:
        db.close()


def _drop_legacy_post_author_column():
    """`author` moved from Post to Book — drop the now-unused column from
    any already-deployed `posts` table (a fresh DB never had it, since the
    current model doesn't declare it). Per product decision, old author
    values on posts aren't worth preserving, so this is a straight drop
    rather than a data migration. Best-effort: on a SQLite version too old
    to support `DROP COLUMN` (pre-3.35, uncommon), this is skipped with a
    warning rather than crashing startup.
    """
    inspector = inspect(engine)
    if "posts" not in inspector.get_table_names():
        return

    columns = {col["name"] for col in inspector.get_columns("posts")}
    if "author" not in columns:
        return

    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE posts DROP COLUMN author"))
    except Exception as exc:  # pragma: no cover - depends on DB/driver version
        print(f"Warning: could not drop legacy posts.author column ({exc}).")


def _drop_legacy_book_description_column():
    """`description` was removed from Book entirely (product decision, not
    worth preserving old values) — drop the now-unused column from any
    already-deployed `books` table (a fresh DB never had it, since the
    current model doesn't declare it). Mirrors
    `_drop_legacy_post_author_column` above. Best-effort: on a SQLite
    version too old to support `DROP COLUMN` (pre-3.35, uncommon), this is
    skipped with a warning rather than crashing startup.
    """
    inspector = inspect(engine)
    if "books" not in inspector.get_table_names():
        return

    columns = {col["name"] for col in inspector.get_columns("books")}
    if "description" not in columns:
        return

    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE books DROP COLUMN description"))
    except Exception as exc:  # pragma: no cover - depends on DB/driver version
        print(f"Warning: could not drop legacy books.description column ({exc}).")


_migrate_existing_posts_to_books()
_drop_legacy_post_author_column()
_drop_legacy_book_description_column()

app = FastAPI(title="BookLibrary API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/books", response_model=list[schemas.BookOut])
def list_books(db: Session = Depends(get_db)):
    return db.query(models.Book).order_by(models.Book.title.asc()).all()


@app.post("/api/books", response_model=schemas.BookOut, status_code=status.HTTP_201_CREATED)
def create_book(book: schemas.BookCreate, db: Session = Depends(get_db)):
    db_book = models.Book(**book.model_dump())
    db.add(db_book)
    db.commit()
    db.refresh(db_book)
    return db_book


@app.put("/api/books/{book_id}", response_model=schemas.BookOut)
def update_book(book_id: int, book: schemas.BookUpdate, db: Session = Depends(get_db)):
    db_book = db.query(models.Book).filter(models.Book.id == book_id).first()
    if not db_book:
        raise HTTPException(status_code=404, detail="Book not found")

    for field, value in book.model_dump().items():
        setattr(db_book, field, value)

    db.commit()
    db.refresh(db_book)
    return db_book


@app.delete("/api/books/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_book(book_id: int, db: Session = Depends(get_db)):
    db_book = db.query(models.Book).filter(models.Book.id == book_id).first()
    if not db_book:
        raise HTTPException(status_code=404, detail="Book not found")

    # Posts.book_id is NOT NULL with no cascade configured on the FK (see
    # models.py), and the startup migration above goes out of its way to
    # keep pre-existing posts attached to a real book rather than orphaning
    # them. Deleting a book out from under its posts would violate that
    # same "never lose/orphan a post" intent, so this is a hard block
    # instead of a cascade delete — the admin has to delete/reassign the
    # posts first.
    post_count = db.query(models.Post).filter(models.Post.book_id == book_id).count()
    if post_count > 0:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Cannot delete '{db_book.title}': it still has {post_count} "
                "post(s). Delete or reassign them first."
            ),
        )

    db.delete(db_book)
    db.commit()
    return None


@app.get("/api/books/{book_id}/posts", response_model=list[schemas.PostOut])
def list_posts_for_book(
    book_id: int,
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    book = db.query(models.Book).filter(models.Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    query = db.query(models.Post).filter(models.Post.book_id == book_id)
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(
                models.Post.title.ilike(pattern),
                models.Post.description.ilike(pattern),
            )
        )
    return query.order_by(models.Post.created_at.desc()).all()


@app.get("/api/posts", response_model=list[schemas.PostOut])
def list_posts(search: str | None = Query(default=None), db: Session = Depends(get_db)):
    query = db.query(models.Post)
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(
                models.Post.title.ilike(pattern),
                models.Post.description.ilike(pattern),
            )
        )
    return query.order_by(models.Post.created_at.desc()).all()


@app.get("/api/posts/{post_id}", response_model=schemas.PostOut)
def get_post(post_id: int, db: Session = Depends(get_db)):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


def _require_book(book_id: int, db: Session):
    book = db.query(models.Book).filter(models.Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return book


@app.post("/api/posts", response_model=schemas.PostOut, status_code=status.HTTP_201_CREATED)
def create_post(post: schemas.PostCreate, db: Session = Depends(get_db)):
    _require_book(post.book_id, db)

    db_post = models.Post(**post.model_dump())
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    return db_post


@app.put("/api/posts/{post_id}", response_model=schemas.PostOut)
def update_post(post_id: int, post: schemas.PostUpdate, db: Session = Depends(get_db)):
    db_post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not db_post:
        raise HTTPException(status_code=404, detail="Post not found")

    _require_book(post.book_id, db)

    for field, value in post.model_dump().items():
        setattr(db_post, field, value)

    db.commit()
    db.refresh(db_post)
    return db_post


@app.delete("/api/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(post_id: int, db: Session = Depends(get_db)):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    db.delete(post)
    db.commit()
    return None
