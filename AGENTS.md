# AGENTS.md

Instructions for AI coding agents (Codex CLI, Cursor, Claude Code, etc.) working in this
repository. See also `CLAUDE.md` (Claude Code specific) and `ARCHITECTURE.md` (system
design rationale).

## Repo layout

Three independent projects, no shared code:

- `api/` — Python/FastAPI backend, source of truth (SQLite only, no file storage)
- `admin/` — React/Vite web app, the only write client
- `mobile/` — Expo/React Native app, read-only client

Each has its own README with setup instructions; don't assume a command from one applies to
another (different package managers, different languages).

A post is `{title, author, description}` — there is no file upload or PDF/EPUB rendering
anywhere in this app (an earlier version had that; it was deliberately removed in favor of
a plain long-text `description` field). Don't reintroduce file handling without being asked.

## Before making changes

- Changes to `api/main.py` routes or `api/schemas.py` response shapes affect both `admin/`
  and `mobile/` — check `admin/src/api.js` and `mobile/src/api.js` for hand-written fetch
  code that assumes the current shape; there is no generated/shared client to keep in sync
  automatically.
- `admin/.env` and `mobile/config.js` both hardcode an API base URL independently — a
  backend port/host change needs updating in both places, there's no single source of truth
  for it.
- `mobile/` has zero native module dependencies right now — `npx expo start` + Expo Go is
  sufficient for testing any change. If a change reintroduces a native module, it brings back
  the native-prebuild requirement documented in `mobile/ANDROID_BUILD.md` — that's a real
  cost, not just a config tweak.

## Running things

See `CLAUDE.md` for exact commands per project (backend venv/uvicorn, admin npm scripts,
mobile Expo). `mobile/ANDROID_BUILD.md` is currently not relevant (kept for reference from
when this app used native PDF-reading modules) — don't follow it unless a native module is
actually back in the dependency tree.

## Known gaps (not bugs — don't "fix" without discussion)

- No authentication anywhere in the system; CORS on the API is wide open. This is a
  deliberate dev-only posture, not an oversight.
- No automated tests exist in any of the three projects.
