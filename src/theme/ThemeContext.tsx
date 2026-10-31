import React, { createContext, useContext, useMemo, useState } from 'react';
import { StyleSheet, useColorScheme, type TextStyle } from 'react-native';
import { useSettings } from '@/context/SettingsContext';
import { usePro } from '@/context/ProContext';
import { DEFAULT_THEME_ID, THEMES, getThemeDef, resolveTheme, type Theme, type ThemeId } from './themes';

export type { Theme } from './themes';

export const TEXT_SCALES = { normal: 1, large: 1.15, xlarge: 1.3 } as const;
export type TextScaleKey = keyof typeof TEXT_SCALES;
/** Dark / light for the Classic theme (the other themes have a fixed scheme). */
export type ThemePref = 'system' | 'dark' | 'light';

/**
 * Figures for numbers: lining (Playfair's default figures are old-style) and tabular, so totals line up and a
 * ticking clock doesn't jump. Only for numbers — Inter's tabular set also widens the hyphen ("one - time").
 */
export const TABULAR: TextStyle['fontVariant'] = ['lining-nums', 'tabular-nums'];
const LINING: TextStyle['fontVariant'] = ['lining-nums'];

/** Text presets. Sizes are the "normal" scale; <Txt> multiplies them by `theme.scale`. */
export const TYPE = {
  display: { fontSize: 36, fontWeight: '800', letterSpacing: -0.6, lineHeight: 42, fontVariant: TABULAR },
  h1: { fontSize: 27, fontWeight: '800', letterSpacing: -0.4, lineHeight: 34, fontVariant: LINING },
  h2: { fontSize: 21, fontWeight: '700', letterSpacing: -0.2, lineHeight: 27, fontVariant: LINING },
  h3: { fontSize: 17, fontWeight: '700', lineHeight: 23, fontVariant: LINING },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 23 },
  bodyStrong: { fontSize: 16, fontWeight: '600', lineHeight: 23 },
  small: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  smallStrong: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  caption: { fontSize: 13, fontWeight: '500', lineHeight: 18 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', lineHeight: 16 },
  num: { fontSize: 16, fontWeight: '700', fontVariant: TABULAR },
} satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof TYPE;

const DEFAULT_THEME: Theme = resolveTheme(THEMES[0], true, 1);
const ThemeContext = createContext<Theme>(DEFAULT_THEME);

interface ThemeControl {
  /** the saved choice (a Pro theme stays saved while Pro is missing, but the free default is shown) */
  themeId: ThemeId;
  /** the theme on screen */
  activeId: ThemeId;
  /** a theme tried on in the theme picker, not saved */
  previewId: ThemeId | null;
  /** what Classic shows */
  autoDark: boolean;
  setTheme: (id: ThemeId) => void;
  setPreview: (id: ThemeId | null) => void;
}

const ThemeControlContext = createContext<ThemeControl | null>(null);

/** Needs <SettingsProvider> (saved theme, text size) and <ProProvider> (Pro themes) above it. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { themeId, themePref, textScale, update } = useSettings();
  const { isPro } = usePro();
  const system = useColorScheme();
  const [previewId, setPreview] = useState<ThemeId | null>(null);
  const autoDark = themePref === 'system' ? system !== 'light' : themePref === 'dark';
  const saved = getThemeDef(themeId);
  const activeId = previewId ?? (saved.isPro && !isPro ? DEFAULT_THEME_ID : saved.id);
  const theme = useMemo(() => resolveTheme(getThemeDef(activeId), autoDark, TEXT_SCALES[textScale]), [activeId, autoDark, textScale]);
  const control = useMemo<ThemeControl>(
    () => ({ themeId, activeId, previewId, autoDark, setTheme: (id) => update({ themeId: id }), setPreview }),
    [themeId, activeId, previewId, autoDark, update]
  );
  return (
    <ThemeControlContext.Provider value={control}>
      <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
    </ThemeControlContext.Provider>
  );
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

export function useThemeControl(): ThemeControl {
  const ctx = useContext(ThemeControlContext);
  if (!ctx) throw new Error('useThemeControl must be used inside <ThemeProvider>.');
  return ctx;
}

/**
 * Theme-aware StyleSheet: `const useStyles = makeStyles((t) => ({ card: { backgroundColor: t.c.surface } }))`,
 * then `const s = useStyles()` inside the component. Sheets are cached per theme object.
 */
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(factory: (t: Theme) => T): () => T {
  const cache = new WeakMap<Theme, T>();
  return function useStyles(): T {
    const t = useTheme();
    let sheet = cache.get(t);
    if (!sheet) {
      sheet = StyleSheet.create(factory(t));
      cache.set(t, sheet);
    }
    return sheet;
  };
}
