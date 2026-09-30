from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import expression

from database import Base


class Book(Base):
    __tablename__ = "books"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    author = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    # Nullable at the column level only so the startup migration in main.py
    # can ALTER TABLE it onto a non-empty table without a NOT NULL default;
    # every row is backfilled by that migration and every new row gets an
    # explicit value from create_book(), so in practice this is never NULL.
    position = Column(Integer, nullable=True)

    posts = relationship("Post", back_populates="book")


class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    book_id = Column(Integer, ForeignKey("books.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    # Scoped per book (position 0 exists once per book, not once globally).
    # Same nullable-for-migration rationale as Book.position above.
    position = Column(Integer, nullable=True)
    # Admin-curated flag backing the mobile Books-screen slider. NOT NULL with
    # a server default so the startup ALTER TABLE works on non-empty tables.
    is_highlighted = Column(Boolean, nullable=False, default=False, server_default=expression.false())

    book = relationship("Book", back_populates="posts")
