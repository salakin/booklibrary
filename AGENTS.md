# AGENTS.md

Instructions for AI coding agents (Codex CLI, Cursor, Claude Code, etc.) working in this
repository. See also `CLAUDE.md` (Claude Code specific) and `ARCHITECTURE.md` (system
design rationale).

## Repo layout

Three independent projects, no shared code:

- `api/` — Python/FastAPI backend, source of truth (SQLite + local disk uploads)
- `admin/` — React/Vite web app, the only write client
- `mobile/` — Expo/React Native app, read-only client

Each has its own README with setup instructions; don't assume a command from one applies to
another (different package managers, different languages).

## Before making changes

- Changes to `api/main.py` routes or `api/schemas.py` response shapes affect both `admin/`
  and `mobile/` — check `admin/src/api.js` and `mobile/src/api.js` for hand-written fetch
  code that assumes the current shape; there is no generated/shared client to keep in sync
  automatically.
- `admin/.env` and `mobile/config.js` both hardcode an API base URL independently — a
  backend port/host change needs updating in both places, there's no single source of truth
  for it.
- `mobile/` has no Expo Go path for testing PDF rendering changes — `react-native-pdf` and
  `react-native-blob-util` require a native prebuild (`npx expo prebuild && npx expo
  run:android`). Don't assume `npx expo start` + Expo Go is sufficient for verifying reader
  changes; it's only sufficient for `HomeScreen`/navigation changes.

## Running things

See `CLAUDE.md` for exact commands per project (backend venv/uvicorn, admin npm scripts,
mobile Expo/Android build). `mobile/ANDROID_BUILD.md` has the full command-line-only
Android SDK setup used when no Android Studio is present on the machine — read it before
re-deriving Android toolchain paths/env vars from scratch.

## Known gaps (not bugs — don't "fix" without discussion)

- No authentication anywhere in the system; CORS on the API is wide open. This is a
  deliberate dev-only posture, not an oversight.
- EPUB files are not renderable in the mobile app (`ReaderScreen` shows a fallback
  "open in browser" link). No shared code path was started for this — it's an open
  follow-up, not a partial implementation to complete.
- No automated tests exist in any of the three projects.
