import os
import uuid
from pathlib import Path

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

import models
import schemas
from database import Base, SessionLocal, engine, get_db

Base.metadata.create_all(bind=engine)

UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".epub"}
ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/epub+zip",
    "application/octet-stream",  # some clients send this for .epub
}
MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50MB

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
    return db.query(models.Book).order_by(models.Book.uploaded_at.desc()).all()


@app.get("/api/books/{book_id}", response_model=schemas.BookOut)
def get_book(book_id: int, db: Session = Depends(get_db)):
    book = db.query(models.Book).filter(models.Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return book


@app.get("/api/books/{book_id}/file")
def get_book_file(book_id: int, db: Session = Depends(get_db)):
    book = db.query(models.Book).filter(models.Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    file_path = UPLOAD_DIR / book.file_name
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File missing on disk")

    ext = file_path.suffix.lower()
    media_type = "application/pdf" if ext == ".pdf" else "application/epub+zip"

    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=book.file_name.split("-", 1)[-1],
    )


@app.post("/api/books", response_model=schemas.BookOut, status_code=status.HTTP_201_CREATED)
async def create_book(
    title: str = Form(...),
    author: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    original_name = file.filename or ""
    ext = Path(original_name).suffix.lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .pdf and .epub files are allowed",
        )

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum size of {MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB",
        )
    if len(contents) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file")

    stored_name = f"{uuid.uuid4()}-{original_name}"
    dest_path = UPLOAD_DIR / stored_name

    with open(dest_path, "wb") as f:
        f.write(contents)

    book = models.Book(
        title=title,
        author=author,
        file_name=stored_name,
        file_size_bytes=len(contents),
    )
    db.add(book)
    db.commit()
    db.refresh(book)
    return book


@app.delete("/api/books/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_book(book_id: int, db: Session = Depends(get_db)):
    book = db.query(models.Book).filter(models.Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    file_path = UPLOAD_DIR / book.file_name
    if file_path.exists():
        os.remove(file_path)

    db.delete(book)
    db.commit()
    return None
