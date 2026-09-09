# BookLibrary

Monorepo with three parts:

- [api/](api/) — FastAPI backend (booklibrary-api), SQLite + local disk storage
- [admin/](admin/) — React (Vite) admin panel (BookLibrary.Admin)
- [mobile/](mobile/) — Expo React Native app (BookLibraryMobile)

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
npx expo prebuild
npx expo run:android    # or: npx expo run:ios (macOS only)
```

Set the API URL in [mobile/config.js](mobile/config.js) first — use your machine's LAN IP if testing on a physical device. See [mobile/README.md](mobile/README.md) for why `react-native-pdf` needs a prebuild/dev client instead of plain Expo Go.

A debug APK has already been built once on this machine without Android Studio — see [mobile/ANDROID_BUILD.md](mobile/ANDROID_BUILD.md) for the exact command-line SDK setup, env vars, and gotchas. Output: `mobile/android/app/build/outputs/apk/debug/app-debug.apk`.

## Notes

- CORS on the API is wide open (`*`) — dev only.
- Uploaded files land in `api/uploads/`; metadata lives in `api/booklibrary.db` (both git-ignored).
- Allowed upload types: `.pdf`, `.epub`. Max size: 50MB.
