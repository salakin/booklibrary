from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict


class BookBase(BaseModel):
    title: str
    author: str | None = None


class BookCreate(BookBase):
    pass


class BookUpdate(BookBase):
    pass


class BookOut(BookBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    position: int


class BookListItem(BookOut):
    """A book as it appears in the paginated list.

    Carries `post_count` so clients can show a per-book post total without
    fetching every post in the system (which is exactly what pagination is
    here to avoid). Not used for create/update responses, which return a bare
    ORM `Book` with no such attribute.
    """

    post_count: int = 0


class PostBase(BaseModel):
    title: str
    description: str
    book_id: int


class PostCreate(PostBase):
    pass


class PostUpdate(PostBase):
    pass


class PostOut(PostBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    position: int


class ReorderRequest(BaseModel):
    """Body for both reorder endpoints: the full, ordered list of ids in the
    scope being reordered (all books, or all posts in one book). The server
    assigns positions 0..n-1 by list order rather than accepting explicit
    positions, so there's no way for a client to send gaps or duplicates.
    """

    ids: list[int]


ItemT = TypeVar("ItemT")


class Page(BaseModel, Generic[ItemT]):
    """Envelope for every paginated list endpoint.

    `total` is the count of rows matching the query *before* limit/offset, so
    a client can show "showing 20 of 137" without extra requests. `has_more`
    is derived from it rather than from `len(items)` so the last page is
    reported correctly even when it happens to be exactly `limit` long.
    """

    items: list[ItemT]
    total: int
    limit: int
    offset: int
    has_more: bool
