# BookLibraryMobile

Expo (React Native) app for browsing and reading books from booklibrary-api.

- Home screen lists books from `GET /api/books` with pull-to-refresh and loading/error/empty states.
- Tapping a book opens a reader screen that streams `GET /api/books/{id}/file`.
- PDF files render with `react-native-pdf` (backed by `react-native-blob-util`).
- EPUB files are not yet renderable in-app — no Expo-friendly EPUB reader is wired up. The reader screen shows a fallback with a link to open the file in the browser. Follow-up: integrate an EPUB reader (e.g. a WebView + epub.js bridge).

## Configuration

Edit [config.js](./config.js) and set `API_BASE_URL`:

```js
export const API_BASE_URL = 'http://localhost:8000';
```

- iOS Simulator / Android Emulator: `http://localhost:8000` usually works (Android emulator may need `http://10.0.2.2:8000`).
- Physical device via Expo Go: use your computer's LAN IP, e.g. `http://192.168.1.23:8000`, and make sure the device is on the same network and the API's CORS/host allows it.

## Important: this uses native modules, not just Expo Go

`react-native-pdf` and `react-native-blob-util` are native modules that are **not included in the stock Expo Go app**. To run the PDF reader you need a custom dev client or a prebuilt native project:

```bash
npm install
npx expo prebuild        # generates ios/ and android/ native projects
npx expo run:android     # or: npx expo run:ios (macOS only)
```

Alternatively, build a custom dev client with EAS Build and install that on your device/simulator instead of Expo Go.

If you only want to see the list screen without setting up native builds, `npx expo start --web` or Expo Go will work for `HomeScreen`, but opening a PDF will fail since the native module isn't present there.

If this machine has no Android Studio installed, see [ANDROID_BUILD.md](./ANDROID_BUILD.md) for the exact command-line-only setup (SDK location, JDK version, env vars) and gotchas hit getting a debug APK built without it.

## Setup & Run

```bash
cd mobile
npm install
npx expo prebuild
npx expo run:android   # or npx expo run:ios
```

For quick iteration on non-PDF screens only:

```bash
npx expo start
```
