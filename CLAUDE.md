# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository structure

This is a monorepo with three independent projects, each with its own dependency tree and its own README:

- `api/` — FastAPI backend (`booklibrary-api`)
- `admin/` — React + Vite admin panel (`BookLibrary.Admin`)
- `mobile/` — Expo React Native app (`BookLibraryMobile`)

The backend must be running for either client to do anything useful — both talk to it over HTTP, there is no shared code between the three.

Each post is a `{title, author, description}` record — there is no file upload or PDF/EPUB reading in this app (an earlier version had that; it was removed).

## Commands

### api/ (FastAPI + SQLAlchemy + SQLite)

```bash
cd api
python -m venv .venv
.venv\Scripts\activate        # Windows. macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload     # http://localhost:8000, docs at /docs
```

No test suite or linter is configured for this project.

### admin/ (Vite + React)

```bash
cd admin
npm install
npm run dev       # http://localhost:5173
npm run build
npm run lint       # oxlint
```

No test suite is configured for this project.

### mobile/ (Expo + React Native)

```bash
cd mobile
npm install
npx expo start
```

No native module dependencies — the app runs entirely in Expo Go, no prebuild or native build needed. (`mobile/ANDROID_BUILD.md` documents a from-scratch Android SDK setup from when this app used native PDF-reading modules; kept for reference only, not currently relevant.) No test suite is configured for this project.

## Architecture

### api/

Three files hold essentially the whole app:
- `database.py` — SQLAlchemy engine/session setup, SQLite file at `api/booklibrary.db` (created on first run, relative to wherever uvicorn is started from).
- `models.py` — the single `Post` ORM model (`id`, `title`, `author`, `description`, `created_at`).
- `schemas.py` — Pydantic `PostCreate`/`PostOut` request/response shapes.
- `main.py` — all four routes (`GET /api/posts`, `GET /api/posts/{id}`, `POST /api/posts`, `DELETE /api/posts/{id}`) and CORS (wide open, dev-only). `POST /api/posts` takes a JSON body, not multipart — there's nothing to validate beyond what Pydantic already enforces.

### admin/

Single-page app, no routing. `src/api.js` is the only place that knows the backend's shape (`fetchPosts`, `createPost`, `deletePost`) — it reads the base URL from `VITE_API_BASE_URL` (set in `admin/.env`, defaults to `http://localhost:8000`). `src/App.jsx` owns all state (post list, create form, loading/error) and re-fetches the full list after every mutation rather than patching local state — there is no optimistic UI.

### mobile/

Two-screen stack navigation (`@react-navigation/native-stack`, defined in `App.js`): `HomeScreen` → `PostDetailScreen`. `src/api.js` mirrors the admin client but read-only (`fetchPosts`) and imports the base URL from the single `config.js` at the project root — that's the one file to edit when pointing at a different backend (e.g. a LAN IP for a physical device, since `localhost` on the phone means the phone itself). `PostDetailScreen` just renders the full `title`/`author`/`description` of whatever post object was passed via navigation params — no extra fetch on that screen.
