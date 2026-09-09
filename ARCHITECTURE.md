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
                    │  Disk:   uploads/    │
                    └──────────┬───────────┘
                     REST/JSON │ multipart upload
                     ┌─────────┴─────────┐
                     │                   │
           ┌─────────▼────────┐  ┌───────▼──────────┐
           │  admin/ (Vite)    │  │  mobile/ (Expo)   │
           │  upload + delete  │  │  browse + read    │
           │  http://:5173     │  │  Expo Go / APK    │
           └───────────────────┘  └───────────────────┘
```

## api/ — system of record

FastAPI + SQLAlchemy, single `Book` table in SQLite (`api/booklibrary.db`). Files live on
local disk under `api/uploads/`, named `<uuid>-<original filename>` to avoid collisions;
the DB row's `file_name` column holds that generated name, and the original name is
recovered only at download time (`GET /api/books/{id}/file` strips the UUID prefix back off
for the `Content-Disposition` filename).

This is the only stateful piece. Both clients are otherwise stateless — reloading either
one just re-fetches from `GET /api/books`.

Validation lives entirely in `POST /api/books`: extension allowlist (`.pdf`, `.epub`) and a
50MB size cap, both enforced server-side. Neither client duplicates this validation beyond
the file picker's `accept` filter, so a client bypassing the picker (or a raw API call) is
still caught by the server.

CORS is wide open (`allow_origins=["*"]`) — this is a deliberate dev-only choice, not an
oversight; there's no auth anywhere in the system, so tightening CORS without adding auth
wouldn't add real protection.

## admin/ — the only way to mutate data

The admin panel is the sole write path in the system: it's the only client that calls
`POST /api/books` and `DELETE /api/books/{id}`. The mobile app is read-only by construction
(`mobile/src/api.js` only exposes `fetchBooks`/`fileUrl`) — there's no reason for a phone to
upload a library file over a REST multipart call, so that path was never built there.

State management is intentionally naive: every mutation (upload, delete) triggers a full
re-`fetchBooks()` rather than patching local state optimistically. For a single-table admin
tool with no concurrent multi-user editing story, this trades a bit of latency for zero
state-sync bugs.

## mobile/ — read + render

Two-screen stack (`HomeScreen` → `ReaderScreen`, wired in `App.js` via
`@react-navigation/native-stack`). The interesting architectural decision is in
`ReaderScreen`: rather than manually downloading the file and pointing a viewer at a local
path, it hands the *remote* URL straight to `react-native-pdf`'s `source.uri`, and lets that
library's internal use of `react-native-blob-util` handle streaming/caching. This keeps the
app free of any manual download-progress or temp-file-cleanup code, at the cost of the PDF
reader depending on a native module that Expo Go doesn't ship — see
`mobile/ANDROID_BUILD.md` for what that costs in practice (a full native prebuild instead of
`expo start`).

EPUB is a placeholder path (extension-sniffed in `ReaderScreen`, falls back to
"open in browser"), not a partial implementation — no Expo-compatible EPUB renderer was
wired in, and that's called out as a known follow-up rather than left silent.

## Why no shared package

Three ecosystems (Python, Vite/browser JS, Expo/React Native JS) with different build
tooling and no code that would actually be identical across them (the two `api.js` files
differ by design — admin needs write methods, mobile doesn't) made a shared `packages/`
workspace not worth the tooling overhead for a project this size. If a fourth client or a
second backend consumer shows up, revisit this.
