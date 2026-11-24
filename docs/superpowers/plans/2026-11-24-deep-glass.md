# Deep Glass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Azqm gets a grown-up look: a free default theme "Deep Glass", a realistic body silhouette instead of the cartoon figure, glass buttons and a floating tab bar, line icons instead of food/meal emoji.

**Architecture:** A new token theme plus three new theme effects (`backdrop`, `buttonStyle`, `tabBar`, `figure`) that only Deep Glass switches on; shared components read them. Pure logic (silhouette geometry, look migration, icon/colour tables) lives in small modules with Jest tests; components stay thin.

**Tech Stack:** Expo SDK 57, React Native 0.86, TypeScript, react-native-svg 15, new: jest-expo (dev), expo-haptics, lucide-react-native.

**Spec:** `docs/superpowers/specs/2026-11-24-deep-glass-design.md`

## Global Constraints
- Expo modules are added with `npx expo install <pkg>` (SDK-matched versions); dev tools with `npx expo install <pkg> -- --save-dev`.
- New UI texts: `tr(bg, en)` plus the English-keyed catalogs `src/i18n/locales/{de,es,fr,it,ru,tr}.json`.
- No real-time blur (no BlurView); glass = translucent fills over a static backdrop.
- Other themes keep their colours, fonts and shapes; they only get the new figure, icons and press vibration.
- Deep Glass values: background #0A0F1F → #120A26; surface #141A2E; card rgba(255,255,255,0.08); card border rgba(255,255,255,0.16); accent #7DD3FC (text on it #0A0F1F); second accent #C084FC; ring #7DD3FC → #C084FC; text #FFFFFF / #A9B1C7; Inter for display, body, numbers.
- Checks after every task: `npm run typecheck`, `npm run lint`, `npm test` all pass.

## Review Focus
1. Light-scheme users (Classic with "light") are never moved to the dark Deep Glass — test in Task 5.
2. A Pro user on Glass Elegance (or any non-default theme) keeps it — test in Task 5.
3. The floating tab bar must not hide the last row of a long list (food search results, Analysis) — bottom padding in Task 4, checked on the phone in Task 7.
4. Secondary text stays readable on a glass card — contrast test (≥ 4.5:1 for #A9B1C7 on the card over the background) in Task 3.
5. A food category without an icon or colour (new category later) falls back to a neutral icon — test in Task 6.

---

### Task 1: Test runner + silhouette geometry

**Files:** Create `src/components/figure/silhouette.ts`, `src/components/figure/silhouette.test.ts`; Modify `package.json` (jest preset `jest-expo`, script `"test": "jest"`).

**Interfaces — Produces:**
- `fatnessOf(bmi: number): number` — BMI 16 → 0 … 40 → 1, clamped.
- `measures(bmi: number, sex: Sex): { shoulder: number; waist: number; hip: number }` — half-widths in the 200×440 figure box.
- `silhouette(bmi: number, sex: Sex): { body: string; armL: string; armR: string; head: { cx: number; cy: number; rx: number; ry: number } }` — closed smooth SVG paths (Catmull-Rom through contour points, as in the approved mockup https://claude.ai/artifact/BmB316iFpxZMoLCNtKJqAM).

- [ ] **Step 1:** `npx expo install jest-expo jest @types/jest -- --save-dev`; add `"jest": { "preset": "jest-expo" }` and the script.
- [ ] **Step 2: Failing tests** in `silhouette.test.ts`: `fatnessOf` gives 0 for 10 and 16, 0.5 for 28, 1 for 40 and 50; `measures(35,'female').waist > measures(22,'female').waist > measures(17,'female').waist`; `measures(22,'female').hip > measures(22,'female').waist` and `measures(22,'male').shoulder > measures(22,'female').shoulder`; every path from `silhouette(27.7,'male')` starts with `M` and ends with `Z`.
- [ ] **Step 3: Run** `npx jest src/components/figure` — Expected: FAIL (module missing).
- [ ] **Step 4: Implement** (contour point tables from the mockup's `bodyPoints`/`armPoints`; `measures` reads the same tables).
- [ ] **Step 5: Run** — Expected: PASS. **Commit** "Figure: realistic silhouette geometry (tested)".

### Task 2: BodyFigure draws the silhouette

**Files:** Modify `src/components/BodyFigure.tsx` (same props: `bmi`, `sex`, `size?`, `fromBmi?`), `src/theme/themes.ts` (`ThemeEffects.figure?: 'glass'`).

**Interfaces — Consumes:** Task 1 `silhouette`, `fatnessOf`.

- [ ] **Step 1:** Draw arms (behind), body, head from `silhouette(shownBmi, sex)` in a 200×440 viewBox; keep `useTween` and a subtle breathing (scaleY 1 → 1.01, 3.2 s loop). Colours: `figure === 'glass'` → fill rgba(255,255,255,0.18), stroke rgba(255,255,255,0.7), soft glow (a wider low-opacity stroke underneath); otherwise a vertical gradient `t.c.textMuted` → `t.c.surfaceAlt` with a side shade. A floor shadow ellipse.
- [ ] **Step 2: Run** the checks — Expected: all pass. **Commit** "Figure: realistic silhouette instead of the cartoon".

### Task 3: Deep Glass theme and backdrop

**Files:** Modify `src/theme/themes.ts` (ThemeId `'deep_glass'`, first in `THEMES`, `DEFAULT_THEME_ID = 'deep_glass'`, `ThemeEffects.backdrop?: 'glows'`, `buttonStyle?: 'glass'`, `tabBar?: 'floating'`), `src/components/ui.tsx` (`GlassBackdrop`, rendered by `Screen` after `GradientFill` when `t.fx.backdrop === 'glows'`); locales (theme name "Deep Glass"); Test `src/theme/deepGlass.test.ts`.

**Interfaces — Produces:** `GlassBackdrop(): JSX.Element` (static SVG: radial glows indigo #6366F1 at 15%/10%, sky #0EA5E9 at 90%/30%, pink #EC4899 at 60%/95%, opacities 0.55 / 0.45 / 0.35).

- [ ] **Step 1: Failing tests:** `THEMES[0].id === 'deep_glass'`, `DEFAULT_THEME_ID === 'deep_glass'`, `getThemeDef('deep_glass').isPro === false`; contrast of #FFFFFF and #A9B1C7 over the card colour composited on #0A0F1F is ≥ 4.5 (helper in the test: WCAG relative luminance).
- [ ] **Step 2: Run** `npx jest src/theme` — Expected: FAIL.
- [ ] **Step 3: Implement** with the Global Constraints values; `fx: { glow: 1, bgGradient: ['#0A0F1F', '#120A26'], backdrop: 'glows', buttonStyle: 'glass', tabBar: 'floating', figure: 'glass' }`, shape `{ radius: 22, border: 1, padding: 18, gap: 14, screen: 16, control: 16, chip: 20, bar: 8 }`, fonts Inter ×3 scale 1.
- [ ] **Step 4: Run** — PASS. **Commit** "Deep Glass theme as the free default".

### Task 4: Glass buttons, press feel, floating tab bar

**Files:** Modify `src/components/ui.tsx` (`Button`, `Screen` bottom padding), `src/app/(tabs)/_layout.tsx`.

- [ ] **Step 1:** `npx expo install expo-haptics`.
- [ ] **Step 2:** `Button` variant `primary` with `buttonStyle === 'glass'`: background rgba(255,255,255,0.14), border 1 rgba(255,255,255,0.35), label `t.c.text`, no glow shadow; pressed → `transform: [{ scale: 0.97 }]`. Every theme: `Haptics.impactAsync(ImpactFeedbackStyle.Light)` on press-in of primary buttons (wrapped in try/catch).
- [ ] **Step 3:** Tab bar when `tabBar === 'floating'`: `position: 'absolute'`, left/right 12, bottom `Math.max(insets.bottom, 10)`, height 64, radius 26, background rgba(20,26,46,0.92), border 1 rgba(255,255,255,0.14), elevation 0. `Screen` scroll content `paddingBottom` 48 + 88 when floating.
- [ ] **Step 4: Run** the checks — PASS. **Commit** "Glass buttons, press vibration, floating tab bar".

### Task 5: Move old-default users once, with a way back

**Files:** Create `src/theme/lookMigration.ts`, `src/theme/lookMigration.test.ts`; Modify `src/context/SettingsContext.tsx` (`AppSettings.lookVersion: number`, `showLookNote: boolean`; DEFAULTS `lookVersion: 2`, `showLookNote: false`), `src/app/(tabs)/index.tsx` (note card at the top), locales.

**Interfaces — Produces:** `migrateLook(saved: { themeId?: unknown; themePref?: unknown; lookVersion?: unknown }): { themeId: ThemeId | undefined; lookVersion: 2; showLookNote: boolean }` — `themeId` undefined means "keep what is saved".

- [ ] **Step 1: Failing tests:** `{themeId:'obsidian_amber'}` → `deep_glass` + note; `{themeId:'classic', themePref:'light'}` → keep, no note; `{themeId:'glass_elegance'}` → keep, no note; `{themeId:'obsidian_amber', lookVersion:2}` → keep, no note; `{}` (new install) → keep, no note.
- [ ] **Step 2: Run** `npx jest src/theme/lookMigration` — FAIL. **Step 3: Implement**, apply it in the settings load (save once).
- [ ] **Step 4:** Today note card when `showLookNote`: text `tr('Azqm има нов вид. Старият е в Настройки → Теми.', 'Azqm has a new look. The old one is in Settings → Themes.')`, buttons `tr('Остави', 'Keep')` → hide; `tr('Върни стария', 'Back to the old look')` → `themeId: 'obsidian_amber'`, hide. Catalog entries in 6 languages.
- [ ] **Step 5: Run** — PASS. **Commit** "Move old-default users to Deep Glass once, with a way back".

### Task 6: Line icons for foods and meals

**Files:** Create `src/data/foodIcons.ts`, `src/data/foodIcons.test.ts`, `src/components/FoodIcon.tsx`; Modify `src/components/food/FoodRow.tsx`, `src/components/add/FoodSearch.tsx`, `src/components/food/AmountEditor.tsx`, `src/components/add/ManualEntryForm.tsx`, `src/app/(tabs)/index.tsx` (meal headers).

**Interfaces — Produces:**
- `CATEGORY_ICON: Record<FoodCategory, IconKey>`, `CATEGORY_COLOR: Record<FoodCategory, string>`, `categoryIconKey(key: string): IconKey` (fallback `'utensils'`), `categoryColor(key: string): string` (fallback the theme-neutral #A9B1C7); `IconKey` = lucide names used: beef, ham, fish, egg, milk, cheese (custom), droplet, carrot, apple, nut, bean, wheat, candy, droplets, coffee, wine, soup, star, utensils; meals: sunrise, sun, moon, apple; recent: clock.
- `CategoryIcon({ category, size, color }): JSX.Element`, `MealIcon({ meal, size, color }): JSX.Element`.

- [ ] **Step 1:** `npx expo install lucide-react-native` (pin the resolved version in package.json).
- [ ] **Step 2: Failing tests:** every `FOOD_CATEGORIES` key has an icon and a colour; `categoryIconKey('unknown') === 'utensils'`; `categoryColor('unknown')` is a #RRGGBB.
- [ ] **Step 3: Run** `npx jest src/data/foodIcons` — FAIL. **Step 4: Implement** (colours from the approved mockup: meat #F87171, deli #FB7185, fish #60A5FA, eggs #FBBF24, dairy #E2E8F0, cheese #FCD34D, fats #FDE68A, vegetables #4ADE80, fruits #F472B6, nuts #D6A26B, legumes #A3E635, grains #F59E0B, sweets #C084FC, sauces #FB923C, drinks #C8A27A, alcohol #E879F9, dishes #2DD4BF, custom #7DD3FC).
- [ ] **Step 5:** Use them: FoodRow circle (glass: rgba white 0.08 + 1 px rgba white 0.16, icon white; other themes: `surfaceAlt`, icon `t.c.text`); FoodSearch chips get `icon` in the group colour and labels without emoji (🕑 → clock, ⭐ → star); meal chips and Today meal headers use `MealIcon`. Keep `emoji` fields in the data (other screens/exports may use them).
- [ ] **Step 6: Run** — PASS. **Commit** "Line icons for foods and meals instead of emoji".

### Task 7: Preview build for the owner

- [ ] **Step 1:** Push the branch `feature/deep-glass`; run the CI preview build (`com.tanatos.azqm.preview`) on it with `gh workflow run`.
- [ ] **Step 2:** Send the APK to the owner (SendUserFile) with what to check: Today, Add food (search list end above the tab bar), Progress figure at BMI from their profile, Settings → Themes (old look back), a long list scroll.
- [ ] **Step 3:** Fixes from the owner's check; release (version 1.6.0, tag) only on their OK.
