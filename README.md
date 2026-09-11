# BookLibrary

Monorepo with three parts:

- [api/](api/) — FastAPI backend (booklibrary-api), SQLite storage
- [admin/](admin/) — React (Vite) admin panel (BookLibrary.Admin)
- [mobile/](mobile/) — Expo React Native app (BookLibraryMobile)

Each post has a title, author, and long text description — there's no file upload/PDF reading in this app.

See [ARCHITECTURE.md](ARCHITECTURE.md) for how the three fit together, [AGENTS.md](AGENTS.md) for AI-agent-specific working notes, and [CLAUDE.md](CLAUDE.md) for Claude Code.

## Run locally

### 1. Backend (start this first)

```bash
cd api
python -m venv .venv
.venv\Scripts\activate        # Windows. macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

API: http://localhost:8000 — Docs: http://localhost:8000/docs

### 2. Admin panel

```bash
cd admin
npm install
npm run dev
```

Opens at http://localhost:5173. Reads the API URL from `admin/.env` (`VITE_API_BASE_URL`, defaults to `http://localhost:8000`).

### 3. Mobile app

```bash
cd mobile
npm install
npx expo start
```

Set the API URL in [mobile/config.js](mobile/config.js) first — use your machine's LAN IP if testing on a physical device. No native build needed — this app has no native module dependencies and runs entirely in Expo Go.

## Notes

- CORS on the API is wide open (`*`) — dev only.
- Post metadata lives in `api/booklibrary.db` (git-ignored).
