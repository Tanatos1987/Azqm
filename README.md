# Keto OMAD Tracker

Android app (React Native + Expo, TypeScript) for tracking a keto / OMAD (One
Meal A Day) lifestyle: photo food recognition via Vision AI, barcode lookup,
an offline food diary with CSV export, an OMAD fasting timer, and a
water/electrolytes tracker.

## Stack

- **Expo SDK 57**, **Expo Router** (file-based routing, tabs in `src/app/(tabs)`)
- TypeScript, plain `StyleSheet` (no NativeWind — kept the dependency surface
  minimal; swap in NativeWind later if you want utility classes)
- `expo-sqlite` — fully offline local database (`food_entries`, `hydration_entries`)
- `expo-camera` — photo capture **and** barcode scanning (SDK 57's `CameraView`
  handles both; the old `expo-barcode-scanner` package is retired)
- `expo-secure-store` — the Vision API key never touches AsyncStorage/SQLite
- OpenFoodFacts (`world.openfoodfacts.org`) — free, keyless barcode lookup
- OpenAI (`gpt-4o-mini`) or Google Gemini (`gemini-2.5-flash` by default) —
  configurable in-app under **Настройки** (Settings), including a free-text
  model override in case the provider renames/retires a model
- Icons are a small hand-drawn `react-native-svg` set (`src/components/icons.tsx`)
  instead of `@expo/vector-icons` — Expo deprecated that package in SDK 57 in
  favor of per-family `@react-native-vector-icons/*` packages, and those
  currently pull a `react-dom@19.3.x` peer that conflicts with this project's
  `react@19.2.3`. Drawing the ~15 icons directly avoided that dependency fight
  entirely.

## Project layout

```
src/
  app/                 expo-router routes (every file here is a screen)
    _layout.tsx         root layout: SQLiteProvider + SettingsProvider + DataRefreshProvider
    (tabs)/_layout.tsx  bottom tab bar
    (tabs)/index.tsx    "Днес" — daily macro rings + entry list + CSV export
    (tabs)/add.tsx      "Добави" — photo / barcode / manual entry
    (tabs)/fasting.tsx  "Пост" — OMAD ring timer + water/electrolytes
    (tabs)/settings.tsx "Настройки" — API key, goals, fasting window
  components/          shared UI (rings, rows, segmented control, icon set)
  components/add/      PhotoCapture, BarcodeScan, ManualEntryForm
  api/                 visionClient.ts (OpenAI/Gemini), openFoodFacts.ts
  db/                  schema.ts (CREATE TABLE), queries.ts (typed CRUD)
  context/             SettingsContext (goals/provider/API key), DataRefreshContext
  hooks/               useFastingTimer
  utils/               nutrition math, date helpers, CSV export, electrolyte targets
  theme/colors.ts       dark palette
```

## Running it locally

```powershell
npm install
npx expo start
```

Scan the QR code with **Expo Go** to try it quickly — note that Expo Go only
has the native modules it ships with, so **camera + barcode scanning need a
development build** the first time (see below), not just Expo Go, once you've
added native modules (which this project already has: camera, sqlite,
secure-store). `npx expo start` will tell you to create a dev client if Expo Go
can't satisfy it.

To build a local dev client instead of using EAS Cloud:

```powershell
npx expo run:android
```

(Requires Android Studio / an Android SDK installed locally. If you don't have
that set up, use the EAS Cloud build below instead — no local Android SDK
needed.)

## Configuring Vision AI

Open the app → **Настройки**:

1. Pick **Gemini Flash** (needs a Google AI Studio API key) or **OpenAI**
   (needs an OpenAI API key, model `gpt-4o-mini`).
2. Paste the key — it's stored with `expo-secure-store`, only on-device, and
   is sent only in direct HTTPS calls to that provider from `src/api/visionClient.ts`.
3. Optionally override the model string if the provider renames it later.

Barcode lookups use OpenFoodFacts and need no key.

## Building an installable APK with EAS

`eas.json` already defines a `preview` profile with `"buildType": "apk"` (an
`.apk` installs directly on a device; the default `.aab` format does not).

```powershell
# one-time: install the EAS CLI and log in with your Expo account
npx eas-cli@latest login

# one-time per project: link it to an EAS project (creates one if needed)
npx eas-cli@latest init

# kick off the Android build in Expo's cloud — no local Android SDK required
npx eas-cli@latest build -p android --profile preview
```

The command prints a build URL; when it finishes (a few minutes), it also
prints a **direct download link** for the `.apk`. To get it onto your phone:

- Easiest: open that URL on the phone itself (e.g. paste it into a chat app
  or note-taking app you have on the phone) and tap download — Android will
  prompt to install once you allow "install unknown apps" for that app.
- Or from your PC: `npx eas-cli@latest build:list` to find the build, then
  download the `.apk` and copy it to the phone (USB, cloud drive, etc.) and
  open it there to install.

Camera permission is already declared in `app.json`'s `expo-camera` plugin
block, so the release APK will prompt for it correctly.

## Data & privacy notes

- All food/hydration data lives only in the on-device SQLite file
  (`keto-omad.db`) — nothing is synced anywhere.
- The only network calls are: (a) your chosen Vision AI provider, sending the
  photo you just took, and (b) OpenFoodFacts, sending the scanned barcode.
- CSV export uses `expo-file-system` + `expo-sharing` to hand the file to
  Android's native share sheet — you choose where it goes (Drive, email, etc.).
