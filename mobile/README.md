# BookLibraryMobile

Expo (React Native) app for browsing posts from booklibrary-api.

- Home screen lists posts from `GET /api/posts` with pull-to-refresh and loading/error/empty states, showing title, author, and a description preview.
- Tapping a post opens a detail screen showing the full title, author, and description.

This app has no native module dependencies — it runs entirely in Expo Go, no prebuild or native build required.

## Configuration

Edit [config.js](./config.js) and set `API_BASE_URL`:

```js
export const API_BASE_URL = 'http://localhost:8000';
```

- iOS Simulator / Android Emulator: `http://localhost:8000` usually works (Android emulator may need `http://10.0.2.2:8000`).
- Physical device via Expo Go: use your computer's LAN IP, e.g. `http://192.168.1.23:8000`, and make sure the device is on the same network and the API's CORS/host allows it.

## Setup & Run

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with Expo Go (iOS/Android) or press `a`/`i` in the terminal for an emulator/simulator.

Note: [ANDROID_BUILD.md](./ANDROID_BUILD.md) documents a from-scratch Android SDK setup that was needed when this app used native PDF-reading modules. It's no longer required for this app as it stands, but kept for reference in case native modules are added again later.
