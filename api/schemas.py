from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PostBase(BaseModel):
    title: str
    author: str
    description: str


class PostCreate(PostBase):
    pass


class PostUpdate(PostBase):
    pass


class PostOut(PostBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
