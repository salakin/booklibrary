# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository structure

This is a monorepo with three independent projects, each with its own dependency tree and its own README:

- `api/` — FastAPI backend (`booklibrary-api`)
- `admin/` — React + Vite admin panel (`BookLibrary.Admin`)
- `mobile/` — Expo React Native app (`BookLibraryMobile`)

The backend must be running for either client to do anything useful — both talk to it over HTTP, there is no shared code between the three.

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
npx expo start                          # JS-only, Home screen works in Expo Go
npx expo prebuild --platform android    # generates android/ (required for the PDF reader)
npx expo run:android                    # or run:ios (macOS only)
```

`react-native-pdf` / `react-native-blob-util` are native modules — the Reader screen only works after a prebuild + native run (or a custom EAS dev client), not in a stock Expo Go session. If this machine has no Android Studio, see `mobile/ANDROID_BUILD.md` for the exact command-line-only Android SDK setup (JDK version, `ANDROID_HOME`, `local.properties` gotchas) that was used to produce a working debug APK. No test suite is configured for this project.

## Architecture

### api/

Three files hold essentially the whole app:
- `database.py` — SQLAlchemy engine/session setup, SQLite file at `api/booklibrary.db` (created on first run, relative to wherever uvicorn is started from).
- `models.py` — the single `Book` ORM model (`id`, `title`, `author`, `file_name`, `file_size_bytes`, `uploaded_at`).
- `schemas.py` — Pydantic `BookOut`/`BookBase` response/request shapes.
- `main.py` — all five routes (`GET /api/books`, `GET /api/books/{id}`, `GET /api/books/{id}/file`, `POST /api/books`, `DELETE /api/books/{id}`), CORS (wide open, dev-only), and upload validation (`.pdf`/`.epub` only, 50MB cap).

Uploaded files are written to `api/uploads/<uuid>-<original filename>` and the `Book.file_name` column stores that generated name, not the original — `GET /api/books/{id}/file` strips the UUID prefix back off when setting the download filename. Deleting a book removes both the DB row and the file from disk in one request; if the file is already missing on disk, the row can still be deleted (no ordering guarantee is enforced between the two beyond what's in `delete_book`).

### admin/

Single-page app, no routing. `src/api.js` is the only place that knows the backend's shape (`fetchBooks`, `uploadBook`, `deleteBook`, `fileUrl`) — it reads the base URL from `VITE_API_BASE_URL` (set in `admin/.env`, defaults to `http://localhost:8000`). `src/App.jsx` owns all state (book list, upload form, loading/error) and re-fetches the full list after every mutation rather than patching local state — there is no optimistic UI.

### mobile/

Two-screen stack navigation (`@react-navigation/native-stack`, defined in `App.js`): `HomeScreen` → `ReaderScreen`. `src/api.js` mirrors the admin client but read-only (`fetchBooks`, `fileUrl`) and imports the base URL from the single `config.js` at the project root — that's the one file to edit when pointing at a different backend (e.g. a LAN IP for a physical device, since `localhost` on the phone means the phone itself).

`ReaderScreen` branches on the file extension in `book.file_name`: `.pdf` renders via `react-native-pdf`, passing the remote `fileUrl(id)` directly as the `source.uri` (the library streams/caches it internally via `react-native-blob-util` — there's no manual download step in this codebase). `.epub` has no renderer wired up and falls back to an "open in browser" link (`Linking.openURL`) — this is a known gap, not an oversight; no Expo-managed-compatible EPUB reader was integrated.
