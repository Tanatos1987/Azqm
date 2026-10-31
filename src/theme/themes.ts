/**
 * Azqm themes: colours, fonts and shapes in one place.
 *
 * Two themes are free — Obsidian Amber (the default) and Classic (the original green look, the only one that still
 * follows Settings → dark / light / system) — and the rest come with Pro. A theme gives the design tokens of the
 * spec (background, surface, card border, accents, ring gradient, text); the rest of the palette is derived from
 * them, and the macro, water and fasting colours are one shared semantic set (darker shades on a light theme).
 *
 * Fonts are embedded by the expo-font plugin (app.json) and all have Cyrillic: Plus Jakarta Sans, Space Grotesk,
 * Archivo Black, Syne, Clash Display and Cabinet Grotesk from the design specs have none, so Onest, Tektur,
 * Unbounded, Exo 2 and Wix Madefor Display stand in for them. The Bulgarian letter forms (locl BGR) are removed from
 * the embedded files, so a Bulgarian phone shows the standard Cyrillic shapes (scripts/build-fonts.py).
 */
import { StyleSheet } from 'react-native';
import { tr } from '@/i18n';
import { darkPalette, lightPalette, type Palette } from './palette';

export type ThemeId =
  | 'obsidian_amber'
  | 'classic'
  | 'midnight_coral'
  | 'deep_ocean'
  | 'titanium_lime'
  | 'nordic_matcha'
  | 'bio_natural'
  | 'glass_elegance'
  | 'cyber_tech'
  | 'neon_sport';

export const DEFAULT_THEME_ID: ThemeId = 'obsidian_amber';

export interface ThemeFonts {
  /** headings (h1–h3) */
  display: string;
  /** body text, labels, buttons, inputs */
  body: string;
  /** big numbers: totals, the ring, the fasting clock (needs tabular figures) */
  num: string;
  /** size factor for headings (very wide or small-looking typefaces) */
  displayScale: number;
  numScale: number;
}

export interface ThemeShape {
  /** card corner radius */
  radius: number;
  /** card border width */
  border: number;
  /** padding inside cards */
  padding: number;
  /** space between cards */
  gap: number;
  /** side padding of a screen */
  screen: number;
  /** buttons, inputs, the segmented control */
  control: number;
  chip: number;
  /** chart bar corners */
  bar: number;
}

export interface ThemeEffects {
  /** glow around the rings: 0 none, 1 soft, 2 strong */
  glow: 0 | 1 | 2;
  /** boxShadow of cards (outset or inset) */
  cardShadow?: string;
  /** boxShadow of primary buttons */
  buttonShadow?: string;
  /** background gradient of screens, top to bottom */
  bgGradient?: readonly [string, string];
  /** the original Android elevation under cards (Classic, light) */
  elevation?: boolean;
}

/** The colour tokens of the spec. */
export interface ThemeTokens {
  bgPrimary: string;
  bgSurface: string;
  cardBorder: string;
  accentPrimary: string;
  accentTextOnPrimary: string;
  accentSecondary: string;
  calorieRingGradient: readonly [string, string];
  textPrimary: string;
  textSecondary: string;
}

export interface ThemeDef {
  id: ThemeId;
  isPro: boolean;
  name: () => string;
  /** 'auto' follows Settings → dark / light / system (Classic) */
  scheme: 'dark' | 'light' | 'auto';
  /** palettes for the dark and the light scheme (only the one(s) the scheme uses) */
  palette: { dark?: Palette; light?: Palette };
  ring: (c: Palette) => readonly [string, string];
  fonts: ThemeFonts;
  shape: ThemeShape;
  fx: ThemeEffects;
  /** changes for the light variant of an 'auto' theme */
  lightShape?: Partial<ThemeShape>;
  lightFx?: Partial<ThemeEffects>;
}

/** What components read: the theme on screen, with the text size from Settings. */
export interface Theme {
  id: ThemeId;
  dark: boolean;
  c: Palette;
  /** multiplier applied to every font size (Настройки → Размер на текста) */
  scale: number;
  font: ThemeFonts;
  shape: ThemeShape;
  fx: ThemeEffects;
  /** calorie ring gradient */
  ring: readonly [string, string];
}

// ---- colour helpers ------------------------------------------------------------------

function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** `a` moved towards `b` by `amount` (0…1); both #RRGGBB. */
export function mix(a: string, b: string, amount: number): string {
  const x = rgb(a);
  const y = rgb(b);
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * amount).toString(16).padStart(2, '0')).join('')}`;
}

/** #RRGGBB with an alpha. */
export function alpha(hex: string, a: number): string {
  const [r, g, b] = rgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/** Near-black or white, whichever reads better on `hex`. */
export function onColor(hex: string): string {
  const [r, g, b] = rgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? '#0B0C10' : '#FFFFFF';
}

// ---- semantic colours ----------------------------------------------------------------

type Semantic = Pick<Palette, 'protein' | 'fat' | 'carbs' | 'fiber' | 'water' | 'fast' | 'danger' | 'warning' | 'success' | 'info'>;

/** Protein rose, fat amber, carbs violet (or mint), water sky, fasting indigo. */
const SEMANTIC_DARK: Semantic = {
  protein: '#F43F5E',
  fat: '#FBBF24',
  carbs: '#A855F7',
  fiber: '#A3E635',
  water: '#0EA5E9',
  fast: '#6366F1',
  danger: '#EF4444',
  warning: '#F97316',
  success: '#34D399',
  info: '#60A5FA',
};

/** The same hues, dark enough to read as text on white. */
const SEMANTIC_LIGHT: Semantic = {
  protein: '#E11D48',
  fat: '#D97706',
  carbs: '#9333EA',
  fiber: '#4D7C0F',
  water: '#0284C7',
  fast: '#4F46E5',
  danger: '#DC2626',
  warning: '#C2410C',
  success: '#059669',
  info: '#2563EB',
};

function fromTokens(k: ThemeTokens, dark: boolean, extra: Partial<Semantic> & { card?: string } = {}): Palette {
  const { card, ...over } = extra;
  const sem = { ...(dark ? SEMANTIC_DARK : SEMANTIC_LIGHT), ...over };
  return {
    bg: k.bgPrimary,
    surface: k.bgSurface,
    card: card ?? k.bgSurface,
    cardBorder: k.cardBorder,
    surfaceAlt: mix(k.bgSurface, k.textPrimary, dark ? 0.06 : 0.045),
    border: mix(k.bgSurface, k.textPrimary, dark ? 0.13 : 0.12),
    text: k.textPrimary,
    textMuted: k.textSecondary,
    textFaint: mix(k.textSecondary, k.bgPrimary, 0.35),
    accent: k.accentPrimary,
    onAccent: k.accentTextOnPrimary,
    accentSoft: alpha(k.accentPrimary, dark ? 0.14 : 0.12),
    accent2: k.accentSecondary,
    ...sem,
    dangerSoft: alpha(sem.danger, 0.14),
    warningSoft: alpha(sem.warning, 0.14),
    track: mix(k.bgSurface, k.textPrimary, dark ? 0.09 : 0.08),
    overlay: dark ? 'rgba(0,0,0,0.62)' : 'rgba(15,20,30,0.45)',
    shadow: '#000000',
  };
}

function tokenTheme(
  def: Omit<ThemeDef, 'palette' | 'ring' | 'scheme'> & { scheme: 'dark' | 'light'; tokens: ThemeTokens; extra?: Partial<Semantic> & { card?: string } }
): ThemeDef {
  const { tokens, extra, ...rest } = def;
  const dark = def.scheme === 'dark';
  return { ...rest, palette: { [def.scheme]: fromTokens(tokens, dark, extra) }, ring: () => tokens.calorieRingGradient };
}

// ---- the themes ----------------------------------------------------------------------

/** Onest stands in for Plus Jakarta Sans / Space Grotesk (neither has Cyrillic). */
const SPEC_FONTS: ThemeFonts = { display: 'Onest', body: 'Inter', num: 'Onest', displayScale: 1, numScale: 1 };
const SPEC_SHAPE: ThemeShape = { radius: 18, border: 1, padding: 18, gap: 14, screen: 16, control: 14, chip: 20, bar: 7 };

export const THEMES: readonly ThemeDef[] = [
  tokenTheme({
    id: 'obsidian_amber',
    isPro: false,
    name: () => tr('Обсидиан и кехлибар', 'Obsidian Amber'),
    scheme: 'dark',
    tokens: {
      bgPrimary: '#0B0C10',
      bgSurface: '#14171F',
      cardBorder: 'rgba(255,255,255,0.07)',
      accentPrimary: '#F59E0B',
      accentTextOnPrimary: '#0B0C10',
      accentSecondary: '#10B981',
      calorieRingGradient: ['#F59E0B', '#10B981'],
      textPrimary: '#F9FAFB',
      textSecondary: '#9CA3AF',
    },
    fonts: SPEC_FONTS,
    shape: SPEC_SHAPE,
    fx: { glow: 1 },
  }),
  {
    id: 'classic',
    isPro: false,
    name: () => tr('Класическа', 'Classic'),
    scheme: 'auto',
    palette: { dark: darkPalette, light: lightPalette },
    ring: (c) => [c.accent, c.accent],
    fonts: { display: 'Manrope', body: 'Manrope', num: 'Manrope', displayScale: 1, numScale: 1 },
    shape: { radius: 22, border: 0, padding: 18, gap: 14, screen: 16, control: 14, chip: 20, bar: 7 },
    fx: { glow: 0 },
    lightShape: { border: StyleSheet.hairlineWidth },
    lightFx: { elevation: true },
  },
  tokenTheme({
    id: 'midnight_coral',
    isPro: true,
    name: () => tr('Полунощен корал', 'Midnight Coral'),
    scheme: 'dark',
    tokens: {
      bgPrimary: '#0F0E17',
      bgSurface: '#1A1926',
      cardBorder: 'rgba(168,85,247,0.14)',
      accentPrimary: '#FF5E5B',
      accentTextOnPrimary: '#0F0E17',
      accentSecondary: '#A855F7',
      calorieRingGradient: ['#FF5E5B', '#A855F7'],
      textPrimary: '#FFFFFE',
      textSecondary: '#A7A9BE',
    },
    // Violet is this theme's second colour, so carbs take the mint shade; orange would look like the coral.
    extra: { carbs: '#34D399', warning: '#FBBF24' },
    fonts: SPEC_FONTS,
    shape: SPEC_SHAPE,
    fx: { glow: 1 },
  }),
  tokenTheme({
    id: 'deep_ocean',
    isPro: true,
    name: () => tr('Дълбок океан', 'Deep Ocean'),
    scheme: 'dark',
    tokens: {
      bgPrimary: '#071118',
      bgSurface: '#10212B',
      cardBorder: 'rgba(0,245,212,0.18)',
      accentPrimary: '#00F5D4',
      accentTextOnPrimary: '#071118',
      accentSecondary: '#38BDF8',
      calorieRingGradient: ['#00F5D4', '#38BDF8'],
      textPrimary: '#F0FDFA',
      textSecondary: '#7DD3FC',
    },
    fonts: SPEC_FONTS,
    shape: SPEC_SHAPE,
    fx: { glow: 1 },
  }),
  tokenTheme({
    id: 'titanium_lime',
    isPro: true,
    name: () => tr('Титан и лайм', 'Titanium Lime'),
    scheme: 'dark',
    tokens: {
      bgPrimary: '#121212',
      bgSurface: '#1E1E1E',
      cardBorder: 'rgba(255,255,255,0.08)',
      accentPrimary: '#CCFF00',
      accentTextOnPrimary: '#121212',
      accentSecondary: '#00E5FF',
      calorieRingGradient: ['#CCFF00', '#00E5FF'],
      textPrimary: '#FFFFFF',
      textSecondary: '#8E8E93',
    },
    extra: { fiber: '#2DD4BF' },
    fonts: SPEC_FONTS,
    shape: SPEC_SHAPE,
    fx: { glow: 1 },
  }),
  tokenTheme({
    id: 'nordic_matcha',
    isPro: true,
    name: () => tr('Нордическа матча', 'Nordic Matcha'),
    scheme: 'light',
    tokens: {
      bgPrimary: '#F7F5F0',
      bgSurface: '#FFFFFF',
      cardBorder: 'rgba(27,31,35,0.06)',
      accentPrimary: '#2D6A4F',
      accentTextOnPrimary: '#FFFFFF',
      accentSecondary: '#E07A5F',
      calorieRingGradient: ['#74C69D', '#2D6A4F'],
      textPrimary: '#1B1F23',
      textSecondary: '#6E7781',
    },
    fonts: SPEC_FONTS,
    shape: SPEC_SHAPE,
    fx: { glow: 0, cardShadow: '0px 4px 20px rgba(0,0,0,0.05)' },
  }),
  // "Bio-Natural Premium": deep greens with warm gold, more air between elements. Wix Madefor Display stands in for
  // Clash Display; numbers in Manrope (Wix has no tabular figures).
  tokenTheme({
    id: 'bio_natural',
    isPro: true,
    name: () => tr('Био натурал', 'Bio Natural'),
    scheme: 'dark',
    tokens: {
      bgPrimary: '#0C1410',
      bgSurface: '#15221B',
      cardBorder: 'rgba(116,198,157,0.12)',
      accentPrimary: '#52B788',
      accentTextOnPrimary: '#0C1410',
      accentSecondary: '#DDA15E',
      calorieRingGradient: ['#52B788', '#DDA15E'],
      textPrimary: '#EDF5EF',
      textSecondary: '#9DB8A8',
    },
    fonts: { display: 'WixMadeforDisplay', body: 'Manrope', num: 'Manrope', displayScale: 1, numScale: 1 },
    shape: { radius: 22, border: 1, padding: 22, gap: 18, screen: 20, control: 16, chip: 20, bar: 8 },
    fx: { glow: 1 },
  }),
  // "Glassmorphic Elegance": see-through cards on a night-blue to deep-green gradient, Playfair Display headings.
  // Numbers in Inter: Playfair has old-style, proportional figures.
  tokenTheme({
    id: 'glass_elegance',
    isPro: true,
    name: () => tr('Стъклена елегантност', 'Glass Elegance'),
    scheme: 'dark',
    tokens: {
      bgPrimary: '#0A0F1D',
      bgSurface: '#121A24',
      cardBorder: 'rgba(255,255,255,0.08)',
      accentPrimary: '#34D399',
      accentTextOnPrimary: '#04261A',
      accentSecondary: '#E2E8F0',
      calorieRingGradient: ['#34D399', '#E2E8F0'],
      textPrimary: '#F8FAFC',
      textSecondary: '#A8B3C4',
    },
    extra: { card: 'rgba(255,255,255,0.04)' },
    // AzqmSerif = Playfair Display, renamed because the embedded files are modified (its licence reserves the name).
    fonts: { display: 'AzqmSerif', body: 'Inter', num: 'Inter', displayScale: 1.04, numScale: 1 },
    shape: { radius: 22, border: 1, padding: 18, gap: 14, screen: 16, control: 16, chip: 20, bar: 8 },
    fx: { glow: 1, bgGradient: ['#0A0F1D', '#061A13'] },
  }),
  // "Neomorphic Cyber-Tech": pressed-in panels with a teal edge, emerald accent with a glow. Tektur stands in for
  // Space Grotesk; body text in Montserrat.
  tokenTheme({
    id: 'cyber_tech',
    isPro: true,
    name: () => tr('Кибер техно', 'Cyber Tech'),
    scheme: 'dark',
    tokens: {
      bgPrimary: '#0B0C10',
      bgSurface: '#14171F',
      cardBorder: 'rgba(0,245,212,0.15)',
      accentPrimary: '#10B981',
      accentTextOnPrimary: '#0B0C10',
      accentSecondary: '#00F5D4',
      calorieRingGradient: ['#10B981', '#00F5D4'],
      textPrimary: '#ECFEFF',
      textSecondary: '#8FA3AD',
    },
    fonts: { display: 'Tektur', body: 'Montserrat', num: 'Tektur', displayScale: 1, numScale: 1 },
    shape: { radius: 16, border: 1, padding: 18, gap: 14, screen: 16, control: 12, chip: 12, bar: 3 },
    fx: {
      glow: 2,
      cardShadow: 'inset 0px 1px 1px rgba(255,255,255,0.06), inset 0px -6px 14px rgba(0,0,0,0.45)',
      buttonShadow: '0px 0px 18px rgba(16,185,129,0.55)',
    },
  }),
  // "Futuristic Sport / Gamified": sharp corners, neon cyan and green, wide Unbounded headings (for Archivo Black)
  // and Exo 2 text (for Syne).
  tokenTheme({
    id: 'neon_sport',
    isPro: true,
    name: () => tr('Неонов спорт', 'Neon Sport'),
    scheme: 'dark',
    tokens: {
      bgPrimary: '#08090D',
      bgSurface: '#13161F',
      cardBorder: 'rgba(0,229,255,0.14)',
      accentPrimary: '#00E5FF',
      accentTextOnPrimary: '#08090D',
      accentSecondary: '#00FF66',
      calorieRingGradient: ['#00E5FF', '#00FF66'],
      textPrimary: '#FFFFFF',
      textSecondary: '#8B93A7',
    },
    extra: { fiber: '#F472B6' },
    fonts: { display: 'Unbounded', body: 'Exo2', num: 'Unbounded', displayScale: 0.84, numScale: 0.9 },
    shape: { radius: 8, border: 1, padding: 16, gap: 12, screen: 16, control: 6, chip: 6, bar: 2 },
    fx: { glow: 1 },
  }),
];

export const PRO_THEME_COUNT = THEMES.filter((d) => d.isPro).length;

export function isThemeId(id: unknown): id is ThemeId {
  return typeof id === 'string' && THEMES.some((d) => d.id === id);
}

export function getThemeDef(id: ThemeId): ThemeDef {
  return THEMES.find((d) => d.id === id) ?? THEMES[0];
}

/** `autoDark`: what Classic shows (Settings → dark / light / system). */
export function resolveTheme(def: ThemeDef, autoDark: boolean, scale: number): Theme {
  const dark = def.scheme === 'auto' ? autoDark : def.scheme === 'dark';
  const c = (dark ? def.palette.dark : def.palette.light) ?? def.palette.dark ?? def.palette.light!;
  const light = !dark && def.scheme === 'auto';
  return {
    id: def.id,
    dark,
    c,
    scale,
    font: def.fonts,
    shape: light ? { ...def.shape, ...def.lightShape } : def.shape,
    fx: light ? { ...def.fx, ...def.lightFx } : def.fx,
    ring: def.ring(c),
  };
}
