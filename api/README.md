# booklibrary-api

FastAPI backend for the BookLibrary app. Stores book metadata in SQLite (`booklibrary.db`) and files on disk under `uploads/`.

## Setup

```bash
cd api
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Run

```bash
uvicorn main:app --reload
```

API runs at http://localhost:8000. Interactive docs at http://localhost:8000/docs.

## Endpoints

| Method | Path                  | Description                          |
|--------|-----------------------|--------------------------------------|
| GET    | /api/books            | List all books                       |
| GET    | /api/books/{id}       | Get one book's metadata              |
| GET    | /api/books/{id}/file  | Download/stream the book file        |
| POST   | /api/books            | Upload a new book (multipart/form)   |
| DELETE | /api/books/{id}       | Delete a book's record and its file  |

`POST /api/books` expects multipart/form-data fields: `title`, `author`, `file` (`.pdf` or `.epub`, max 50MB).

## Notes

- CORS is open to all origins — this is for local development only; lock it down before deploying.
- The SQLite file and uploaded files are created relative to the working directory the server is started from (the `api/` folder).
