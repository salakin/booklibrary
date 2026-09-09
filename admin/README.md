# BookLibrary.Admin

React (Vite) admin panel for BookLibrary. Lists all books, lets you upload new ones, and delete existing ones via the booklibrary-api backend.

## Setup

```bash
cd admin
npm install
```

Configure the API base URL in `.env` (defaults to `http://localhost:8000`):

```
VITE_API_BASE_URL=http://localhost:8000
```

## Run

```bash
npm run dev
```

Opens at http://localhost:5173. Make sure the `api` backend is running first (see `../api/README.md`).

## Build

```bash
npm run build
```
