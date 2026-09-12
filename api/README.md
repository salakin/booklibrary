# booklibrary-api

FastAPI backend for the BookLibrary app. Stores posts (title, author, description) in SQLite (`booklibrary.db`).

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

| Method | Path             | Description             |
|--------|------------------|--------------------------|
| GET    | /api/posts       | List all posts             |
| GET    | /api/posts/{id}  | Get one post                |
| POST   | /api/posts       | Create a new post (JSON)    |
| PUT    | /api/posts/{id}  | Update a post (JSON)        |
| DELETE | /api/posts/{id}  | Delete a post                |

`POST /api/posts` and `PUT /api/posts/{id}` expect a JSON body: `{"title": "...", "author": "...", "description": "..."}`.

## Notes

- CORS is open to all origins — this is for local development only; lock it down before deploying.
- The SQLite file is created relative to the working directory the server is started from (the `api/` folder).
