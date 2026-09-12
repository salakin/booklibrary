# Architecture

BookLibrary is three independently-deployable apps sharing one HTTP contract. There is no
shared code, shared types, or message queue between them — the contract *is* the FastAPI
OpenAPI schema (`http://localhost:8000/docs`), and each client (`admin/`, `mobile/`) has its
own hand-written fetch wrapper (`src/api.js`) that mirrors it.

```
                    ┌─────────────────────┐
                    │   api/ (FastAPI)     │
                    │                      │
                    │  SQLite: booklibrary.db
                    └──────────┬───────────┘
                          REST/JSON
                     ┌─────────┴─────────┐
                     │                   │
           ┌─────────▼────────┐  ┌───────▼──────────┐
           │  admin/ (Vite)    │  │  mobile/ (Expo)   │
           │  create + delete  │  │  browse + read     │
           │  http://:5173     │  │  Expo Go           │
           └───────────────────┘  └───────────────────┘
```

## api/ — system of record

FastAPI + SQLAlchemy, single `Post` table in SQLite (`api/booklibrary.db`) — `title`,
`author`, `description` (long text), `created_at`. This is the only stateful piece. Both
clients are otherwise stateless — reloading either one just re-fetches from
`GET /api/posts`.

`POST /api/posts` takes a plain JSON body; validation is whatever Pydantic's `PostCreate`
schema enforces (all three fields required, no length caps). There's no file handling
anywhere in this system — an earlier version of this app accepted PDF/EPUB uploads with
local disk storage; that was removed in favor of a plain text `description` field.

CORS is wide open (`allow_origins=["*"]`) — this is a deliberate dev-only choice, not an
oversight; there's no auth anywhere in the system, so tightening CORS without adding auth
wouldn't add real protection.

## admin/ — the only way to mutate data

The admin panel is the sole write path in the system: it's the only client that calls
`POST /api/posts`, `PUT /api/posts/{id}`, and `DELETE /api/posts/{id}`. The mobile app is
read-only by construction (`mobile/src/api.js` only exposes `fetchPosts`) — there's no
create/edit flow on mobile.

Editing reuses the same form as creating (`App.jsx` tracks an `editingId` — `null` means the
form is in create mode, otherwise it's editing that post). `PUT /api/posts/{id}` replaces all
three fields wholesale; there's no partial-update (PATCH-style) path, so the client always
sends the full title/author/description even if only one changed.

State management is intentionally naive: every mutation (create, update, delete) triggers a
full re-`fetchPosts()` rather than patching local state optimistically. For a single-table
admin tool with no concurrent multi-user editing story, this trades a bit of latency for zero
state-sync bugs.

## mobile/ — read + render

Two-screen stack (`HomeScreen` → `PostDetailScreen`, wired in `App.js` via
`@react-navigation/native-stack`). `PostDetailScreen` does no fetching of its own — the full
post object (including `description`) is already in memory from the list screen and is
passed through as a navigation param, so opening a post is instant with no loading state.

This app has zero native module dependencies and runs entirely in Expo Go. That wasn't
always true: an earlier version rendered PDFs via `react-native-pdf`/`react-native-blob-util`,
which forced a full native prebuild (`mobile/ANDROID_BUILD.md` documents the from-scratch
Android SDK setup that required). Dropping file/PDF support in favor of plain text posts
also dropped that entire native-build requirement — worth keeping in mind if file support
ever comes back, since it reintroduces that cost.

## Why no shared package

Three ecosystems (Python, Vite/browser JS, Expo/React Native JS) with different build
tooling and no code that would actually be identical across them (the two `api.js` files
differ by design — admin needs write methods, mobile doesn't) made a shared `packages/`
workspace not worth the tooling overhead for a project this size. If a fourth client or a
second backend consumer shows up, revisit this.
