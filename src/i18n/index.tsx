/**
 * Bulgarian / English UI. Strings are written inline as pairs — `tr('Запази', 'Save')` — so every
 * screen stays readable and there is no key table to keep in sync.
 *
 * The current language lives in a module variable (set by <I18nProvider> during render, before its
 * children render), so `tr()` also works in plain modules (diets, analysis, export, dates).
 * Components call `useI18n()` so they re-render when the language changes; anything computed in
 * useMemo/useCallback that calls `tr()` must list `lang` in its dependencies.
 */
import React, { createContext, useContext, useMemo } from 'react';

export type Lang = 'bg' | 'en';

let current: Lang = 'bg';

export function getLang(): Lang {
  return current;
}

/** Pick the string for the current language. */
export function tr(bg: string, en: string): string {
  return current === 'en' ? en : bg;
}

/** BCP 47 locale for toLocale*String / localeCompare. */
export function locale(): string {
  return current === 'en' ? 'en-GB' : 'bg-BG';
}

/** Language for a fresh install: Bulgarian on Bulgarian phones, English everywhere else. */
export function deviceLang(): Lang {
  try {
    const loc = Intl.DateTimeFormat().resolvedOptions().locale ?? '';
    return loc.toLowerCase().startsWith('bg') ? 'bg' : 'en';
  } catch {
    return 'bg';
  }
}

interface I18nValue {
  lang: Lang;
  tr: (bg: string, en: string) => string;
}

const I18nContext = createContext<I18nValue>({ lang: 'bg', tr });

export function I18nProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  current = lang;
  const value = useMemo<I18nValue>(() => ({ lang, tr }), [lang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}
