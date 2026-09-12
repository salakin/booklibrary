# BookLibrary

Monorepo with three parts:

- [api/](api/) — FastAPI backend (booklibrary-api)
- [admin/](admin/) — React (Vite) admin panel (BookLibrary.Admin)
- [mobile/](mobile/) — Expo React Native app, branded "Lawbook"

Each post has a title, author, and long text description — there's no file upload/PDF reading in this app.

See [ARCHITECTURE.md](ARCHITECTURE.md) for how the three fit together, [AGENTS.md](AGENTS.md) for AI-agent-specific working notes, and [CLAUDE.md](CLAUDE.md) for Claude Code.

## Live deployment

- Admin panel: https://salakin.github.io/booklibrary/
- API: hosted on Render, backed by a Neon Postgres database (both free tier)
- Mobile app: a built `.apk` pointed at the same live API — see `mobile/CLAUDE.md`/`mobile/README.md` for how it was built

## Run locally

### 1. Backend (start this first)

```bash
cd api
python -m venv .venv
.venv\Scripts\activate        # Windows. macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

API: http://localhost:8000 — Docs: http://localhost:8000/docs. Uses local SQLite by default; set `DATABASE_URL` to point at Postgres instead (same code path used in production).

### 2. Admin panel

```bash
cd admin
npm install
npm run dev
```

Opens at http://localhost:5173. Reads the API URL from `admin/.env` (`VITE_API_BASE_URL`, defaults to `http://localhost:8000` for local dev — the production build uses `admin/.env.production` instead, pointed at the live Render API).

### 3. Mobile app

```bash
cd mobile
npm install
npx expo start
```

Set the API URL in [mobile/config.js](mobile/config.js) first (currently points at the live Render API). No native build needed for regular development — this app has no native module dependencies and runs entirely in Expo Go. A standalone `.apk` is a separate, occasional step — see `CLAUDE.md`.

## Notes

- CORS on the API is wide open (`*`) — dev only.
- Post metadata lives in `api/booklibrary.db` locally (git-ignored), or in Neon in production.
- The GitHub repo is public (required for free GitHub Pages) — checked history before making it so; no secrets were ever committed.
