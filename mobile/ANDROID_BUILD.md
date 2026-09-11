# Building the Android APK locally

> **Currently not needed.** This app dropped its native dependencies
> (`react-native-pdf`, `react-native-blob-util`) when it pivoted from a PDF/ebook reader to
> a plain text-post app — it now runs entirely in Expo Go, no prebuild or native Android
> build required. This doc is kept for reference in case native modules get added again.

This machine has no Android Studio. Everything needed to build a debug APK was installed
by hand as command-line tools. This doc records exactly what's installed, where, and the
gotchas hit getting `gradlew assembleDebug` to succeed, so it doesn't need to be
rediscovered.

## What's installed on this machine

| Tool | Version | Location |
|---|---|---|
| Node.js | 24.19.0 (LTS) | `C:\Program Files\nodejs` |
| JDK 11 | 11.0.16.1 | `C:\Program Files\Java\jdk-11.0.16.1` (pre-existing; **not** used for the Android build) |
| JDK 17 | 17.0.20.101 (Microsoft build) | `C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot` (**required** — `sdkmanager` and AGP need 17+) |
| Android command-line tools | build 15859902 | `D:\android-sdk\cmdline-tools\latest` |
| Android SDK packages | platform-tools, `platforms;android-35`, `build-tools;35.0.0` (Gradle also auto-pulled `build-tools;36.0.0` + NDK `27.1.12297006` per the Expo config) | `D:\android-sdk` |

None of this was installed via winget/Android Studio — the full IDE install brings a GUI
setup wizard that can't be driven headlessly. Instead the standalone command-line tools zip
was pulled directly from Google.

## Gotchas hit along the way

1. **`developer.android.com/studio` download links point at `edgedl.me.gvt1.com`**, which
   404s when curl'd directly (looks like a session/edge-CDN link, browser-only). The actual
   stable, curl-able path is `https://dl.google.com/android/repository/<filename>` — note
   `repository`, not `repo` (the `/repo/` path also 404s). Always verify the SHA-256 against
   what the docs page lists before trusting a download.

2. **`sdkmanager` refuses to run on JDK 11** ("Java version 17 or higher is required").
   Installed `Microsoft.OpenJDK.17` via winget alongside the existing JDK 11 — `JAVA_HOME`
   must point at the 17 install for any `sdkmanager`/Gradle commands.

3. **`local.properties` `sdk.dir` must not use single backslashes.** Windows path
   `D:\android-sdk` written as `sdk.dir=D:\android-sdk` breaks Java's `.properties` escaping
   (a bare `\a` is not a valid escape) and Gradle fails with a cryptic
   `The filename, directory name, or volume label syntax is incorrect`. Fix: use forward
   slashes — `sdk.dir=D:/android-sdk` — which Gradle/AGP accept fine on Windows.

4. **Gradle shells out to `node` during project configuration** (Expo's autolinking reads
   package.json via a Node script). If `node` isn't on `PATH` in the shell that invokes
   `gradlew`, configuration fails with `A problem occurred starting process 'command
   'node''`. Make sure both the JDK 17 `bin` and the Node install dir are on `PATH` for the
   build shell.

5. **No local Android emulator/device on this machine.** The APK was built but not
   installed/run anywhere — verify on a real device or start an emulator separately.

## Exact commands used

```bash
# one-time SDK setup (already done on this machine, kept here for reference)
export JAVA_HOME="C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot"
export PATH="/c/Program Files/Microsoft/jdk-17.0.20.101-hotspot/bin:$PATH"
cd /d/android-sdk/cmdline-tools/latest/bin
yes | ./sdkmanager.bat --sdk_root="D:\android-sdk" --licenses
./sdkmanager.bat --sdk_root="D:\android-sdk" "platform-tools" "platforms;android-35" "build-tools;35.0.0"
```

```bash
# generate the native android/ project (only needed once, or after config changes)
cd mobile
npx expo prebuild --platform android
```

```properties
# mobile/android/local.properties — not committed, regenerate if missing
sdk.dir=D:/android-sdk
```

```bash
# the actual build
export JAVA_HOME="C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot"
export PATH="/c/Program Files/Microsoft/jdk-17.0.20.101-hotspot/bin:/c/Program Files/nodejs:$PATH"
export ANDROID_HOME="D:\android-sdk"
export ANDROID_SDK_ROOT="D:\android-sdk"
cd mobile/android
./gradlew.bat assembleDebug --no-daemon
```

Output APK: `mobile/android/app/build/outputs/apk/debug/app-debug.apk`

## Notes on build time

First `assembleDebug` on this machine (a Surface with ~16GB RAM, only ~3GB free under
normal load) took **57m 23s wall clock** (351 tasks, 323 executed) — native module
compilation (`react-native-pdf`, `react-native-blob-util`) plus Expo's autolinking/codegen
is heavy, and the machine appears memory-constrained (two Gradle workers each holding
~1GB+ RSS for most of the build). Subsequent builds should be much faster since Gradle
caches dependencies and compiled/up-to-date task outputs.

Confirmed working output: `app-debug.apk`, ~175MB, valid zip archive, built successfully
on 2026-09-09.

This is a **debug** build (signed with the auto-generated debug keystore) — fine for
sideloading/testing, not for Play Store distribution. A release build needs a real
signing config (`android/app/build.gradle` `signingConfigs`) and
`./gradlew.bat assembleRelease`.
