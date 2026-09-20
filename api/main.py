from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, inspect, or_, select, text
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


def _add_position_columns_if_missing():
    """Schema-only half of the `position` migration — add the column via raw
    ALTER TABLE if missing, nothing else.

    This must run before *any* ORM query touches `Book`/`Post`, including the
    ones inside `_migrate_existing_posts_to_books` below: both models now
    declare a `position` column, and SQLAlchemy's ORM `SELECT` always
    includes every mapped column, so even an unrelated query would fail with
    "no such column: posts.position" on a database that predates this
    feature. The backfill half (`_backfill_position_columns`) is a separate
    function that runs later, once `_migrate_existing_posts_to_books` has
    resolved every post's `book_id` — see its docstring.
    """
    inspector = inspect(engine)

    if "books" in inspector.get_table_names():
        columns = {col["name"] for col in inspector.get_columns("books")}
        if "position" not in columns:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE books ADD COLUMN position INTEGER"))

    if "posts" in inspector.get_table_names():
        columns = {col["name"] for col in inspector.get_columns("posts")}
        if "position" not in columns:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE posts ADD COLUMN position INTEGER"))


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


def _backfill_position_columns():
    """Backfill half of the `position` migration — fill in `position` on any
    row that predates this feature so `position ASC, id ASC` reproduces the
    display order these tables already had:
    - books: `title ASC, id ASC` — the alphabetical order `GET /api/books`
      used before this migration.
    - posts: `created_at DESC, id DESC`, scoped per book — the newest-first
      order `GET /api/books/{id}/posts` used before this migration.

    Must run after `_migrate_existing_posts_to_books` (every post needs a
    resolved `book_id` before it can be given a position scoped to that
    book) and after `_add_position_columns_if_missing` (the column has to
    exist first). New rows never hit the backfill loops below —
    `create_book`/`create_post` always assign an explicit position at insert
    time — so on every startup after the first, both loops find nothing to
    do and this is a fast no-op.
    """
    db = SessionLocal()
    try:
        _backfill_book_positions(db)
        _backfill_post_positions(db)
    finally:
        db.close()


def _backfill_book_positions(db):
    unpositioned = (
        db.query(models.Book)
        .filter(models.Book.position.is_(None))
        .order_by(models.Book.title.asc(), models.Book.id.asc())
        .all()
    )
    if not unpositioned:
        return

    next_position = db.query(func.max(models.Book.position)).scalar()
    next_position = 0 if next_position is None else next_position + 1
    for book in unpositioned:
        book.position = next_position
        next_position += 1
    db.commit()


def _backfill_post_positions(db):
    # Positions are scoped per book, so the "next free slot" is computed
    # separately for each book with a gap rather than once globally.
    book_ids_with_gaps = [
        row[0]
        for row in db.query(models.Post.book_id)
        .filter(models.Post.position.is_(None))
        .distinct()
        .all()
    ]
    for book_id in book_ids_with_gaps:
        unpositioned = (
            db.query(models.Post)
            .filter(models.Post.book_id == book_id, models.Post.position.is_(None))
            .order_by(models.Post.created_at.desc(), models.Post.id.desc())
            .all()
        )
        next_position = (
            db.query(func.max(models.Post.position))
            .filter(models.Post.book_id == book_id)
            .scalar()
        )
        next_position = 0 if next_position is None else next_position + 1
        for post in unpositioned:
            post.position = next_position
            next_position += 1
    db.commit()


_add_position_columns_if_missing()
_migrate_existing_posts_to_books()
_drop_legacy_post_author_column()
_drop_legacy_book_description_column()
_backfill_position_columns()

app = FastAPI(title="BookLibrary API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pagination defaults, shared by every list route. MAX_PAGE_SIZE is a hard
# cap so a client can't ask for the entire table in one request
# (`?limit=10000`) and undo the point of paginating at all.
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100


def pagination_params(
    limit: int = Query(default=DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    offset: int = Query(default=0, ge=0),
) -> tuple[int, int]:
    """Shared `?limit=&offset=` query params for the paginated list routes.

    FastAPI enforces the bounds, so an out-of-range limit is a 422 rather
    than a silently clamped value — a client asking for 10000 rows is told
    it can't, instead of quietly getting 100 and assuming that was all.
    """
    return limit, offset


@app.get("/api/books", response_model=schemas.Page[schemas.BookListItem])
def list_books(
    pagination: tuple[int, int] = Depends(pagination_params),
    db: Session = Depends(get_db),
):
    limit, offset = pagination

    total = db.query(models.Book).count()

    # Correlated subquery instead of making the client fetch every post just
    # to count them per book: it is evaluated only for the rows on this page,
    # so the admin panel's post-count column stays correct no matter how the
    # book list is paged.
    post_count = (
        select(func.count(models.Post.id))
        .where(models.Post.book_id == models.Book.id)
        .correlate(models.Book)
        .scalar_subquery()
    )

    rows = (
        db.query(models.Book, post_count)
        # Custom admin-defined order (drag-and-drop in the admin panel writes
        # `position` via PUT /api/books/reorder); `id` is the tiebreaker that
        # makes the ordering total, so two books sharing a position can't
        # swap places between page requests and cause a row to be duplicated
        # on one page and skipped on the next.
        .order_by(models.Book.position.asc(), models.Book.id.asc())
        .limit(limit)
        .offset(offset)
        .all()
    )

    items = []
    for book, count in rows:
        item = schemas.BookListItem.model_validate(book)
        item.post_count = count
        items.append(item)

    return schemas.Page[schemas.BookListItem](
        items=items,
        total=total,
        limit=limit,
        offset=offset,
        has_more=offset + len(items) < total,
    )


@app.post("/api/books", response_model=schemas.BookOut, status_code=status.HTTP_201_CREATED)
def create_book(book: schemas.BookCreate, db: Session = Depends(get_db)):
    # New books are appended to the end of the custom order rather than
    # inserted at 0, so creating a book never reshuffles everything else.
    max_position = db.query(func.max(models.Book.position)).scalar()
    next_position = 0 if max_position is None else max_position + 1

    db_book = models.Book(**book.model_dump(), position=next_position)
    db.add(db_book)
    db.commit()
    db.refresh(db_book)
    return db_book


@app.put("/api/books/reorder", response_model=list[schemas.BookOut])
def reorder_books(payload: schemas.ReorderRequest, db: Session = Depends(get_db)):
    """Set the display order of every book in one shot.

    Registered *above* `PUT /api/books/{book_id}` in this file so the
    literal `/api/books/reorder` path is matched before Starlette tries to
    parse "reorder" as an int `book_id` — route order matters here, not just
    which routes exist.

    `ids` must be exactly the set of existing book ids, each once — this is
    a full reorder, not a partial patch, so the client (the admin panel) is
    expected to load every book before letting the user drag rows.
    """
    ids = payload.ids
    if len(ids) != len(set(ids)):
        raise HTTPException(status_code=400, detail="ids must not contain duplicates")

    existing_ids = {row[0] for row in db.query(models.Book.id).all()}
    if set(ids) != existing_ids:
        unknown = sorted(set(ids) - existing_ids)
        missing = sorted(existing_ids - set(ids))
        detail = "ids must include every book exactly once."
        if unknown:
            detail += f" Unknown id(s): {unknown}."
        if missing:
            detail += f" Missing id(s): {missing}."
        raise HTTPException(status_code=400, detail=detail)

    books_by_id = {book.id: book for book in db.query(models.Book).filter(models.Book.id.in_(ids)).all()}
    for position, book_id in enumerate(ids):
        books_by_id[book_id].position = position
    db.commit()

    return [schemas.BookOut.model_validate(books_by_id[book_id]) for book_id in ids]


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


@app.get("/api/books/{book_id}/posts", response_model=schemas.Page[schemas.PostOut])
def list_posts_for_book(
    book_id: int,
    search: str | None = Query(default=None),
    pagination: tuple[int, int] = Depends(pagination_params),
    db: Session = Depends(get_db),
):
    limit, offset = pagination

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

    # Counted *after* the search filter, so `total`/`has_more` describe the
    # result set the client is actually paging through, not the whole book.
    total = query.count()

    # Custom admin-defined order (drag-and-drop in the admin panel writes
    # `position` via PUT /api/books/{book_id}/posts/reorder), scoped to this
    # book. `id` is the tiebreaker that keeps paging stable if two posts ever
    # share a position.
    rows = (
        query.order_by(models.Post.position.asc(), models.Post.id.asc())
        .limit(limit)
        .offset(offset)
        .all()
    )

    return schemas.Page[schemas.PostOut](
        items=[schemas.PostOut.model_validate(row) for row in rows],
        total=total,
        limit=limit,
        offset=offset,
        has_more=offset + len(rows) < total,
    )


@app.put("/api/books/{book_id}/posts/reorder", response_model=list[schemas.PostOut])
def reorder_posts(book_id: int, payload: schemas.ReorderRequest, db: Session = Depends(get_db)):
    """Set the display order of every post within one book in one shot.

    `ids` must be exactly the set of post ids belonging to `book_id`, each
    once — this is a full reorder of that book's posts, not a partial patch,
    so the client is expected to load every post in the book before letting
    the user drag rows. A post id that exists but belongs to a different
    book is treated the same as an unknown id (400), not silently moved.
    """
    _require_book(book_id, db)

    ids = payload.ids
    if len(ids) != len(set(ids)):
        raise HTTPException(status_code=400, detail="ids must not contain duplicates")

    existing_ids = {
        row[0] for row in db.query(models.Post.id).filter(models.Post.book_id == book_id).all()
    }
    if set(ids) != existing_ids:
        unknown = sorted(set(ids) - existing_ids)
        missing = sorted(existing_ids - set(ids))
        detail = "ids must include every post in this book exactly once."
        if unknown:
            detail += f" Unknown id(s) for this book: {unknown}."
        if missing:
            detail += f" Missing id(s): {missing}."
        raise HTTPException(status_code=400, detail=detail)

    posts_by_id = {
        post.id: post
        for post in db.query(models.Post).filter(models.Post.book_id == book_id, models.Post.id.in_(ids)).all()
    }
    for position, post_id in enumerate(ids):
        posts_by_id[post_id].position = position
    db.commit()

    return [schemas.PostOut.model_validate(posts_by_id[post_id]) for post_id in ids]


# Deliberately left unpaginated and unwrapped. This flat, cross-book list
# used to back the admin panel's per-book post-count column; that now comes
# from `post_count` on `GET /api/books`, so no client calls this route any
# more. Kept as-is for ad-hoc/debug use rather than changed, since changing
# the shape of a route nothing consumes buys nothing.
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

    # New posts are appended to the end of their book's custom order rather
    # than inserted at 0, so creating a post never reshuffles the rest.
    max_position = (
        db.query(func.max(models.Post.position)).filter(models.Post.book_id == post.book_id).scalar()
    )
    next_position = 0 if max_position is None else max_position + 1

    db_post = models.Post(**post.model_dump(), position=next_position)
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
