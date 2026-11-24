# Azqm: "new version" notice inside the app (design, 24.11.2026)

## Intent
The owner: „добави и известие за актуализация вътре в приложението“ — the same as in Real Spy Detector, where an
update was on Google Play but the app never said so.

## Approaches
- **A — Google Play In-App Updates through `expo-in-app-updates` (MIT, Expo module, 0.13.0)** — chosen: Play says
  exactly when this phone can get the update and which kind it allows; no native code of our own.
- B — our own local Expo module around Play's `app-update-ktx` (as in RSD): full control (a "Restart" button after the
  download) but Kotlin we can only compile in CI.
- C — a version file on the landing page: no native code, but it would announce versions Play has not rolled out yet.

## Design
- `useAppUpdate()` (src/hooks) checks when the app starts and whenever it comes back to the front (Android only).
- Card at the top of Today (`updateBanner()` in src/utils decides): "A new version of Azqm is available." +
  "Update" / "Later". "Update" starts a flexible update (download in the background) when Play allows it, otherwise
  Play's full-screen update. While downloading: "The new version is downloading. Azqm restarts by itself when it is
  ready." — the library installs the update (restarts the app) as soon as the download is done.
- "Later" hides the offer until the next start; never a running download. A download that finished while the app was
  closed shows as an offer again; "Update" installs it.
- Texts in the 8 languages. Builds not installed from Google Play (preview APKs) never show the card.

## Verification
Pure rule tested (`updateBanner.test.ts`); the Play flow itself can only be seen with a build installed from Google
Play (internal test or production), after the next release.
