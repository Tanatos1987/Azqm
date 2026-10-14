# Project notes — Azqm (formerly Keto OMAD Tracker)

Running log of what has been built and decided, so work can continue across sessions.

## Status
- **v1 / Phase 1 (2026-09-28)** — as "Keto OMAD Tracker": macro rings, OMAD timer, offline food DB (~130 foods), onboarding with BMR/TDEE, BMI figure, Progress tab. Built with EAS.
- **Azqm 1.0.0 (2026-10-05)** — renamed to Azqm, package `com.tanatos.azqm` (new app id — installs next to the old keto app). GitHub repo `Tanatos1987/Azqm`; APK built by GitHub Actions and published to Releases.
  - Theme system (`src/theme`): dark/light/system, text scale, Inter font embedded via the expo-font plugin. All text goes through `<Txt>` / `<Input>` in `src/components/ui.tsx`; styles via `makeStyles`.
  - 14 diets in `src/data/diets.ts` (macro split, carb basis/cap, fasting window, food-fit rules).
  - Food DB: 1023 foods generated into `src/data/foods.generated.ts` by `scripts/build-foods.mjs` from `data-src/foodmap/*.json` + USDA SR Legacy (30 nutrients). Bulgarian dishes are recipes of USDA ingredients.
  - Nutrient targets (RDA/AI/UL by sex/age/diet) in `src/data/nutrients.ts`; analysis in `src/utils/analysis.ts`.
  - DB `azqm.db` (schema v1): food_entries with `n_<nutrient>` columns + meal, custom_foods, favorites, weight_entries, hydration_entries, fasts. Missing nutrient columns are added automatically on start.
  - Export: xlsx (own writer on fflate, `src/utils/xlsx.ts`), CSV, JSON backup + restore.

- **Azqm 1.0.1 (2026-10-05)** — tab switching lag fixed (`freezeOnBlur` on tabs, memoized Анализ food suggestions, stable FoodRow callbacks). CI also builds `Azqm.aab` for Google Play; `google-play/` holds the store listing (bg/en), 512 icon, 1024×500 feature graphic, privacy policy and a step-by-step Play Console guide (Data safety answers, content rating, closed test 12 testers × 14 days for personal accounts). Blocked RECORD_AUDIO / storage / SYSTEM_ALERT_WINDOW permissions.
- **Azqm 1.1.0 (2026-10-05)** — Bulgarian/English UI. `src/i18n`: inline pairs `tr('бг', 'en')` (no key table), language in a module variable set by `<I18nProvider>` (from `settings.language`), so `tr()` also works in plain modules; components call `useI18n()` to re-render, memos list `lang` in deps; module-level labels are getters. Fresh installs pick the language from the phone locale, old installs stay Bulgarian. Switch in Settings → Appearance and on the first onboarding step.
  - Foods: English names/portions/aliases in `data-src/foodmap-en/*.json` (keyed by id; build fails if a food has no English name). `FoodItem.name` is a language getter, `nameBg`/`nameEn` also present; search indexes both languages. Diary entries keep storing the Bulgarian name in the DB and are displayed via `entryDisplayName()` (`src/utils/entryName.ts`) by `food_id`.
  - Vision prompt, Open Food Facts name, Excel/CSV headers follow the language; JSON backup format unchanged.
- **Azqm 1.2.0 (2026-10-13)** — fixes for the Play Console pre-launch notes and the tab-switch lag.
  - Lag: Hermes on Android builds a new Java formatter for every `toLocaleString` / `toLocaleDateString` / `localeCompare(…, locale)` call. `formatNumber`, `formatDayMonth`, `formatTime` in `src/utils/date.ts` are now plain JS (checked against Intl bg-BG/en-GB on 4M numbers), and `searchFoods` ties are sorted by a cached lower-case key instead of `localeCompare`. `useTween` takes a `snap` threshold so the fasting ring doesn't run a 900 ms animation every second.
  - Chips on Добави were cut in half: a horizontal ScrollView has `flexShrink: 1` and was squeezed by the FlatList; now `flexShrink: 0`.
  - **8 languages** (bg, en, de, es, fr, it, ru, tr). Source keeps the inline pairs `tr('бг', 'en')`; every other language is `src/i18n/locales/<lang>.json` keyed by the English text, and built-in food names are `src/i18n/foods/<lang>.json` keyed by food id (English as fallback for anything missing). Values in texts are placeholders — `tr('цел {h} ч', 'goal {h} h', { h })` — and plurals are `{n|entry|entries}` (Russian: 3 forms one|few|many, French counts 0 as singular). Diet lists go through `trList`. `node scripts/i18n.mjs check` (in CI) fails on a missing text, food name or placeholder mismatch; `node scripts/i18n.mjs jobs <dir>` writes what is missing per language, with the source line as context. Numbers/dates per language in `src/utils/date.ts` (checked against Intl). Search folds accents ("kase" finds "Käse") and indexes the Bulgarian, English and current-language names. Language picker: `src/components/LanguagePicker.tsx` (🌐 button in the Settings header, row in Appearance, chips on the first onboarding step); fresh installs take the phone language when the app has it, else English. Custom foods store the generic portion as "1 порция" and show it translated. The vision prompt asks for the food name in the app language; Open Food Facts uses `product_name_<lang>`.
  - Font Inter → Manrope (`assets/fonts`, OFL). Manrope has locl BGR, so a Bulgarian phone shows Bulgarian letter forms.
  - Play Console: R8 on via `expo-build-properties` (`enableMinifyInReleaseBuilds`; the AAB carries the mapping, CI also uploads `mapping.txt`). `orientation: default` in app.json (no manifest lock, which Play flags) and a runtime lock instead: `expo-screen-orientation` keeps phones (shorter display side < 600 dp) in portrait, tablets/unfolded foldables rotate (`src/app/_layout.tsx`); Android 16 ignores locks on large screens anyway. Content sits in a centered 720 px column (`Screen`, `Sheet`). The edge-to-edge warning lists calls inside React Native itself (`WindowUtilKt.enableEdgeToEdge` and friends, used for Android ≤ 14); the app code calls none of them — it goes away with a React Native update.

## Decisions
- No camera-based offline recognition yet — exact grams from a photo aren't reliable offline. Photo mode needs the user's own Gemini/OpenAI key.
- No icon font / vector-icons package: icons are hand-drawn SVG (`src/components/icons.tsx`).
- Signing key: PKCS#12 made with node-forge, local copy in `C:\Users\k.ivanova.TSMEGA\Azqm-keystore` (password inside), CI copy in repo secrets. Losing both means updates can't install over the old app.
- **Testers install only from Google Play (2026-10-06).** Play App Signing is on: Play signs Azqm with the app signing key (SHA-256 `C7:D4:A9:...:64:AA`), the CI key `azqm` is only the upload key (`56:F1:1A:...:86:1C`). Testers who had installed `Azqm.apk` 1.0.0/1.0.1 from GitHub Releases (versionCode 2/4) saw an update to 1.1.0 (7) in Play that never installed. Fix for them: backup in Settings, uninstall, install from Play, restore. Releases no longer carry the APK.
- Today's partial day is excluded from averages on the Анализ tab when complete days exist.
- No `toLocaleString` / `toLocaleDateString` / `Intl` / `localeCompare(…, locale)` in render paths (slow on Hermes Android) — use the helpers in `src/utils/date.ts`. Export code may still use them (one-off).
- **Every new UI text needs all 6 catalogs.** Write it as `tr('бг', 'en')` (placeholders for values, never template literals with `${}` inside tr), then add the English key and its translation to each `src/i18n/locales/*.json`; `node scripts/i18n.mjs check` must pass before pushing (CI runs it).
- No React Compiler: `tr()` reads a module-level language variable, so auto-memoized components would keep old-language strings.
- R8 code shrinking only, no `shrinkResources`: React Native looks up fonts and bundled images by name (`getIdentifier`), which the resource shrinker can't see.

## Ideas for next phases (not agreed yet)
- Android Health Connect sync, reminders/notifications, recipes builder (own dishes from ingredients), offline photo recognition.

## Building
- Push to `main` → GitHub Actions builds `Azqm.apk` and `Azqm.aab` (artifacts). Tag `vX.Y.Z` → Release with `Azqm.aab` only. Bump `expo.version` in app.json for each release; versionCode = run number.
- **Azqm Preview** — Actions → "Android APK + AAB" → Run workflow, pick the branch, tick "preview": builds an APK with app id `com.tanatos.azqm.preview` and name "Azqm Preview" that installs next to the Play version (own empty data; move data with Settings → backup / restore). APK only, never for Play.
- Local checks before pushing: `npx tsc --noEmit`, `npx expo lint`, `npx expo export --platform android`.
- After adding routes, regenerate typed routes by briefly running `npx expo start --offline`.
- `expo start --tunnel` does not work on the office network (ngrok blocked).
