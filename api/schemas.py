from datetime import datetime

from pydantic import BaseModel, ConfigDict


class BookBase(BaseModel):
    title: str
    author: str


class BookOut(BookBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    file_name: str
    file_size_bytes: int
    uploaded_at: datetime
