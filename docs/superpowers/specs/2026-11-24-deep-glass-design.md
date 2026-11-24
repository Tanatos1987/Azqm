# Azqm "Deep Glass" — a grown-up look for the whole app (design, 24.11.2026)

## Intent
The owner finds Azqm's look childish ("точно от тоя детски дизайн искам да избягам") — above all the
cartoon boy/girl in Progress (`src/components/BodyFigure.tsx`), and the toy-like overall feel. They
asked for proposals, looked at mockups (four directions for the Today screen), picked
**"Стъкло и дълбочина" (glass and depth)**, and chose **option A**: this becomes the app's main look.

Mockups: https://claude.ai/artifact/PMb7rMfzACabCR7tvPuSXS (direction Г) and
https://claude.ai/artifact/BmB316iFpxZMoLCNtKJqAM (realistic figure, buttons).

## Goals
- A new free theme **Deep Glass** ("Стъкло и дълбочина") is the default for new installs: deep
  navy-violet background with soft colour glows, see-through "frosted" cards with a fine light edge,
  white type (Inter), a cyan→violet calorie ring, glass buttons.
- People on the old default (Obsidian Amber) move to Deep Glass once, with a one-time note on Today:
  "New look. The old one is in Settings → Theme" + "Keep" / "Back to the old look".
- The cartoon figure is replaced by a **realistic body silhouette** (no face, no clothes, real
  proportions, smooth BMI morph, subtle breathing), coloured by the theme, in every theme.
- Glass details in Deep Glass: floating rounded tab bar, glass primary buttons that sink slightly when
  pressed, glass segmented controls/chips.

## Non-goals
- No new features, no screen re-layouts beyond styling; everything the app does stays.
- Other themes stay selectable and keep their look (they get the new figure only).
- No real-time background blur (BlurView): the glass effect comes from translucent fills over a soft,
  static background — the same look without the battery and jank cost on cheap Android phones.
- No floating "+" action button (was only in the first mockup page, not chosen).

## Anti-goals
- Anything that reads as cartoonish or "kids' app": mascots, faces, emoji-heavy headers.
- Lower contrast than today: text must stay readable on the glass (WCAG AA for body text).
- A slower app: the backdrop is static, drawn once per screen.

## Approaches (chosen by the owner)
- **A — Deep Glass becomes the main look** (chosen): default for new installs, old-default users moved
  once with a way back, new figure everywhere, old themes kept.
- B — only one more theme in the list: smallest change, but most people would never see it.
- C — every theme becomes a glass variant: biggest change, removes looks people may like.

## Design
- **Theme** `deep_glass` in `src/theme/themes.ts`, first in `THEMES`, `isPro: false`, dark scheme:
  background #0A0F1F → #120A26 plus three static glows (indigo top-left, sky right, pink bottom) drawn
  by a new `GlassBackdrop` (react-native-svg radial gradients) in `Screen`; opaque surface #141A2E for
  sheets/tab bar; card rgba(255,255,255,0.08), card border rgba(255,255,255,0.16); accent #7DD3FC,
  second accent #C084FC, ring gradient #7DD3FC → #C084FC; text #FFFFFF / #A9B1C7; Inter for display,
  body and numbers. Macro colours chosen for contrast on the glass.
- **New theme effects** (`ThemeEffects`): `backdrop: 'glows'`, `buttonStyle: 'glass'`,
  `tabBar: 'floating'` — only Deep Glass uses them; other themes unchanged.
- **Buttons** (`Button` in `src/components/ui.tsx`): glass primary = translucent white fill, light
  edge, white label, a faint top highlight; pressed = scale 0.97. Short vibration on press.
- **Tab bar** (`src/app/(tabs)/_layout.tsx`): floating rounded bar with margin, translucent surface
  and edge; scroll content gets bottom padding so nothing hides under it.
- **Figure**: `BodyFigure` keeps its props (`bmi`, `sex`, `size`, `fromBmi`) and the BMI tween; the
  drawing becomes the realistic silhouette (front view, smooth outline through control points,
  arms behind the torso, theme colours: frosted white with a soft glow in Deep Glass, a neutral
  gradient from the palette in other themes).
- **Migration** (`src/context/SettingsContext.tsx`): a saved flag; once, `obsidian_amber` →
  `deep_glass` and the one-time note is shown; a picked non-default theme is never changed.
- **Typography** (owner's choice from https://claude.ai/artifact/QoeBNKrcbwMPu4xSDmwmcY, option 1):
  Inter for display, body and numbers in Deep Glass (already bundled).
- **Food icons** (option А, approved): the emoji in a grey circle (`categoryEmoji` in
  `src/data/foods.ts`, used by `FoodRow` and the category lists) becomes a thin line icon
  (lucide-react-native, ISC licence; cheese drawn in the same style) in a glass circle, white in
  Deep Glass, the theme text colour elsewhere. In the food-group grid (category picker) the icon
  takes its group colour (option Б's tint) to help scanning. The meal emojis (`MEALS` in
  `src/utils/date.ts`) become line icons too. Emoji used elsewhere (help topics, empty states) are
  left to the builder: replace where it is shown as an icon, keep inside running text.
- Texts (theme name, note) in the app's 8 languages: `tr(bg, en)` plus the English-keyed catalogs in
  `src/i18n/locales/{de,es,fr,it,ru,tr}.json`.

## Verification
- `npm run typecheck`, `npm run lint`.
- Pure logic (silhouette geometry, migration rule) gets unit tests; Azqm has no test runner yet, so a
  minimal one is added as a dev dependency (builder's call which).
- Visual check: a CI "preview" build (`com.tanatos.azqm.preview`) on the owner's phone, or the local
  emulator — the emulator only after asking the owner.

## Left to the builder
Exact macro colours and opacities after a contrast check, the glow positions/sizes, silhouette control
points, the press vibration API, the test runner, where the one-time note sits on Today.
