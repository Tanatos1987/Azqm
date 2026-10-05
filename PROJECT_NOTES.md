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
