from datetime import datetime

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
