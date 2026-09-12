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

### mobile/ (Expo + React Native, app name "Lawbook")

```bash
cd mobile
npm install
npx expo start
```

No native module dependencies for development — `expo start` + Expo Go is sufficient to iterate on any screen. A standalone installable `.apk` is a separate, occasional step (not needed for regular development):

```bash
npx expo prebuild --platform android   # generates android/ (gitignored, regenerate as needed)
cd android
echo "sdk.dir=D:/android-sdk" > local.properties   # forward slashes matter, see gotcha below
./gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a
```

Output: `android/app/build/outputs/apk/release/app-release.apk`. `assembleRelease` (not `assembleDebug`) plus restricting to one ABI is deliberate — a debug, all-ABI build is ~160MB; this combination gets it to ~28MB. It installs fine unsigned/dev-signed since `app/build.gradle` falls back to the debug keystore when no release keystore is configured — fine for personal distribution, not for a Play Store release. `mobile/ANDROID_BUILD.md` documents the from-scratch Android SDK setup (JDK version, gotchas) used on a machine with no Android Studio. No test suite is configured for this project.

## Architecture

### api/

Three files hold essentially the whole app:
- `database.py` — SQLAlchemy engine/session setup, SQLite file at `api/booklibrary.db` (created on first run, relative to wherever uvicorn is started from).
- `models.py` — the single `Post` ORM model (`id`, `title`, `author`, `description`, `created_at`).
- `schemas.py` — Pydantic `PostCreate`/`PostOut` request/response shapes.
- `main.py` — all five routes (`GET /api/posts`, `GET /api/posts/{id}`, `POST /api/posts`, `PUT /api/posts/{id}`, `DELETE /api/posts/{id}`) and CORS (wide open, dev-only). `POST`/`PUT` take a JSON body, not multipart — there's nothing to validate beyond what Pydantic already enforces.

### admin/

Single-page app, no routing. `src/api.js` is the only place that knows the backend's shape (`fetchPosts`, `createPost`, `updatePost`, `deletePost`) — it reads the base URL from `VITE_API_BASE_URL` (`admin/.env` for local dev, `admin/.env.production` for the deployed build — see Deployment below). `src/App.jsx` owns all state (post list, create/edit form via an `editingId` flag, loading/error) and re-fetches the full list after every mutation rather than patching local state — there is no optimistic UI.

### mobile/

Three-screen stack navigation (`@react-navigation/native-stack`, defined in `App.js`): `WelcomeScreen` (static image/text splash, no header, `navigation.replace('Home')` on its button so it's not in the back stack) → `HomeScreen` → `PostDetailScreen`. `src/api.js` mirrors the admin client but read-only (`fetchPosts`) and imports the base URL from the single `config.js` at the project root — that's the one file to edit when pointing at a different backend. `PostDetailScreen` just renders the full `title`/`author`/`description` of whatever post object was passed via navigation params — no extra fetch on that screen.

## Deployment (currently live)

- **Database**: Neon (Postgres free tier). `api/database.py` reads `DATABASE_URL` and falls back to local SQLite if unset — same code either way.
- **API**: Render, deployed from `render.yaml` (a Render Blueprint) at the repo root. Free tier — spins down after ~15min idle, cold-starts on the next request.
- **Admin panel**: GitHub Pages, built with `admin/.env.production` (points at the Render URL) and `vite.config.js`'s `base: '/booklibrary/'` (required since it's served from a repo subpath, not a custom domain). Deployed by building `admin/dist` and force-pushing it as the root of a `gh-pages` branch — there's no CI for this, it's a manual push whenever the admin panel changes and needs redeploying.
- **Repo visibility**: public — GitHub Pages on the free plan requires it. Checked full git history before flipping visibility; no secrets were ever committed (Neon/Cloudflare credentials only ever passed through as shell env vars, never written to a tracked file).
- **mobile/**: `config.js` points at the Render URL, so the built APK works from any network.
