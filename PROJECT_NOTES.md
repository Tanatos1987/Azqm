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

## Decisions
- No camera-based offline recognition yet — exact grams from a photo aren't reliable offline. Photo mode needs the user's own Gemini/OpenAI key.
- No icon font / vector-icons package: icons are hand-drawn SVG (`src/components/icons.tsx`).
- Signing key: PKCS#12 made with node-forge, local copy in `C:\Users\k.ivanova.TSMEGA\Azqm-keystore` (password inside), CI copy in repo secrets. Losing both means updates can't install over the old app.
- Today's partial day is excluded from averages on the Анализ tab when complete days exist.

## Ideas for next phases (not agreed yet)
- Android Health Connect sync, reminders/notifications, recipes builder (own dishes from ingredients), offline photo recognition.

## Building
- Push to `main` → GitHub Actions builds `Azqm.apk` (artifact). Tag `vX.Y.Z` → Release. Bump `expo.version` in app.json for each release; versionCode = run number.
- Local checks before pushing: `npx tsc --noEmit`, `npx expo lint`, `npx expo export --platform android`.
- After adding routes, regenerate typed routes by briefly running `npx expo start --offline`.
- `expo start --tunnel` does not work on the office network (ngrok blocked).
