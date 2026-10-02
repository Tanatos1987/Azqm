# Project notes — Keto OMAD Tracker

Running log of what has been built and decided, so work can continue across sessions.

## Status
- **v1** — macro rings, OMAD fasting timer, hydration/electrolytes, food via Vision API photo, OpenFoodFacts barcode, manual entry.
- **Phase 1 (2026-09-28)** — offline food database with micronutrients (`src/data/foods.ts`), onboarding with BMR/TDEE and automatic keto goals (`src/utils/bodyMetrics.ts`), animated BMI body figure (`src/components/BodyFigure.tsx`), Progress tab with weight log and charts, micronutrient card on Today. DB schema is versioned with `PRAGMA user_version` (currently 2) in `src/db/schema.ts`.

## Decisions
- No camera-based offline recognition yet — exact grams from a photo aren't reliable offline. If added later: TFLite classifier identifies the food, the user confirms the grams.
- Phase 1 avoids new native dependencies: animations use React Native `Animated` (`src/hooks/useTween.ts`), charts are drawn with `react-native-svg`.
- Food values are USDA-style averages per 100 g; Bulgarian dishes are estimates.

## Ideas for next phases (not agreed yet)
- Offline photo recognition (vision-camera + fast-tflite)
- Android Health Connect sync (steps/active calories, write nutrition and weight)
- Custom foods and favorites, a bigger food database

## Building the APK on this machine
- Git is not installed → set `EAS_NO_VCS=1`. Log in with an access token passed as `EXPO_TOKEN`.
- `npx eas-cli@latest build -p android --profile preview --non-interactive`
- `expo start --tunnel` does not work on the office network (ngrok is blocked).
