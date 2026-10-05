import React, { createContext, useContext, useMemo } from 'react';
import { StyleSheet, useColorScheme, type TextStyle } from 'react-native';
import { darkPalette, lightPalette, type Palette } from './palette';
import { useSettings } from '@/context/SettingsContext';

/** Embedded at build time by the expo-font config plugin (app.json) with weights 400–800. */
export const FONT = 'Inter';

export const TEXT_SCALES = { normal: 1, large: 1.15, xlarge: 1.3 } as const;
export type TextScaleKey = keyof typeof TEXT_SCALES;
export type ThemePref = 'system' | 'dark' | 'light';

export interface Theme {
  dark: boolean;
  c: Palette;
  /** multiplier applied to every font size (Настройки → Размер на текста) */
  scale: number;
}

/** Text presets. Sizes are the "normal" scale; <Txt> multiplies them by `theme.scale`. */
export const TYPE = {
  display: { fontSize: 36, fontWeight: '800', letterSpacing: -0.6, lineHeight: 42 },
  h1: { fontSize: 27, fontWeight: '800', letterSpacing: -0.4, lineHeight: 34 },
  h2: { fontSize: 21, fontWeight: '700', letterSpacing: -0.2, lineHeight: 27 },
  h3: { fontSize: 17, fontWeight: '700', lineHeight: 23 },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 23 },
  bodyStrong: { fontSize: 16, fontWeight: '600', lineHeight: 23 },
  small: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  smallStrong: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  caption: { fontSize: 13, fontWeight: '500', lineHeight: 18 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', lineHeight: 16 },
  num: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
} satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof TYPE;

const DEFAULT_THEME: Theme = { dark: true, c: darkPalette, scale: 1 };
const ThemeContext = createContext<Theme>(DEFAULT_THEME);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { themePref, textScale } = useSettings();
  const system = useColorScheme();
  const dark = themePref === 'system' ? system !== 'light' : themePref === 'dark';
  const theme = useMemo<Theme>(() => ({ dark, c: dark ? darkPalette : lightPalette, scale: TEXT_SCALES[textScale] }), [dark, textScale]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
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
