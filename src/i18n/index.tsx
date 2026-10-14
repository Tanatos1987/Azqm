/**
 * UI languages. Bulgarian and English are written inline as pairs — `tr('Запази', 'Save')` — so every screen
 * stays readable. Every other language is a catalog in ./locales/<lang>.json keyed by the English text, and
 * built-in food names live in ./foods/<lang>.json keyed by food id. `npm run i18n:check` lists anything missing;
 * a missing entry shows the English text.
 *
 * Text with values uses placeholders: `tr('цел {h} ч', 'goal {h} h', { h: 16 })`. A plural picks its form from
 * the number: `'{n} {n|entry|entries}'`; Russian lists three forms (one|few|many), French counts 0 as singular.
 *
 * The current language lives in a module variable (set by <I18nProvider> during render, before its
 * children render), so `tr()` also works in plain modules (diets, analysis, export, dates).
 * Components call `useI18n()` so they re-render when the language changes; anything computed in
 * useMemo/useCallback that calls `tr()` must list `lang` in its dependencies.
 */
import React, { createContext, useContext, useMemo } from 'react';
import deUi from './locales/de.json';
import esUi from './locales/es.json';
import frUi from './locales/fr.json';
import itUi from './locales/it.json';
import ruUi from './locales/ru.json';
import trUi from './locales/tr.json';
import deFoods from './foods/de.json';
import esFoods from './foods/es.json';
import frFoods from './foods/fr.json';
import itFoods from './foods/it.json';
import ruFoods from './foods/ru.json';
import trFoods from './foods/tr.json';

export type Lang = 'bg' | 'en' | 'de' | 'es' | 'fr' | 'it' | 'ru' | 'tr';

/** In the order shown in the language picker. `name` is how the language calls itself. */
export const LANGUAGES: readonly { code: Lang; name: string; english: string; locale: string }[] = [
  { code: 'bg', name: 'Български', english: 'Bulgarian', locale: 'bg-BG' },
  { code: 'en', name: 'English', english: 'English', locale: 'en-GB' },
  { code: 'de', name: 'Deutsch', english: 'German', locale: 'de-DE' },
  { code: 'es', name: 'Español', english: 'Spanish', locale: 'es-ES' },
  { code: 'fr', name: 'Français', english: 'French', locale: 'fr-FR' },
  { code: 'it', name: 'Italiano', english: 'Italian', locale: 'it-IT' },
  { code: 'ru', name: 'Русский', english: 'Russian', locale: 'ru-RU' },
  { code: 'tr', name: 'Türkçe', english: 'Turkish', locale: 'tr-TR' },
];

type Catalog = Record<string, string>;

const UI: Partial<Record<Lang, Catalog>> = { de: deUi, es: esUi, fr: frUi, it: itUi, ru: ruUi, tr: trUi };
const FOOD_NAMES: Partial<Record<Lang, Catalog>> = { de: deFoods, es: esFoods, fr: frFoods, it: itFoods, ru: ruFoods, tr: trFoods };

let current: Lang = 'bg';

function setLang(lang: Lang) {
  current = lang;
}

export function getLang(): Lang {
  return current;
}

export function isLang(value: unknown): value is Lang {
  return LANGUAGES.some((l) => l.code === value);
}

export function languageInfo(lang: Lang = current) {
  return LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[1];
}

type Vars = Record<string, string | number>;

/** Text in the current language: Bulgarian and English inline, other languages from their catalog. */
export function tr(bg: string, en: string, vars?: Vars): string {
  const text = current === 'bg' ? bg : current === 'en' ? en : (UI[current]?.[en] ?? en);
  return vars ? fill(text, vars) : text;
}

/** Same as tr() for parallel lists (the diet texts): Bulgarian list, English list, the rest from the catalog. */
export function trList(bg: string[], en: string[]): string[] {
  if (current === 'bg') return bg;
  const catalog = UI[current];
  return catalog ? en.map((s) => catalog[s] ?? s) : en;
}

/** Name of a built-in food in the current language. */
export function foodName(id: string, nameBg: string, nameEn: string): string {
  return current === 'bg' ? nameBg : current === 'en' ? nameEn : (FOOD_NAMES[current]?.[id] ?? nameEn);
}

/** {name} → value; {n|form|form…} → the plural form for n. Unknown names stay as they are. */
const PLACEHOLDER = /\{(\w+)(?:\|([^{}]*))?\}/g;

function fill(text: string, vars: Vars): string {
  return text.replace(PLACEHOLDER, (whole, key: string, forms: string | undefined) => {
    const value = vars[key];
    if (value === undefined) return whole;
    if (forms === undefined) return String(value);
    const list = forms.split('|');
    return list[pluralIndex(Number(value), list.length)];
  });
}

/** CLDR cardinal rules for whole numbers: one/other, French 0–1 → one, Russian one/few/many. */
function pluralIndex(n: number, forms: number): number {
  let i: number;
  if (current === 'ru') {
    const a = Math.abs(n);
    if (!Number.isInteger(a)) i = 1;
    else if (a % 10 === 1 && a % 100 !== 11) i = 0;
    else if (a % 10 >= 2 && a % 10 <= 4 && (a % 100 < 12 || a % 100 > 14)) i = 1;
    else i = 2;
  } else if (current === 'fr') {
    i = Math.abs(n) < 2 ? 0 : 1;
  } else {
    i = n === 1 ? 0 : 1;
  }
  return Math.min(i, forms - 1);
}

/** A label used inside a sentence: lower-cased, except German nouns; Turkish I → ı. */
export function inSentence(label: string): string {
  if (current === 'de') return label;
  if (current === 'tr') return label.replace(/I/g, 'ı').replace(/İ/g, 'i').toLowerCase();
  return label.toLowerCase();
}

/** BCP 47 locale of the current language (export files only — see the note in src/utils/date.ts). */
export function locale(): string {
  return languageInfo().locale;
}

/** Language for a fresh install: the phone's language when the app has it, English otherwise. */
export function deviceLang(): Lang {
  try {
    const code = (Intl.DateTimeFormat().resolvedOptions().locale ?? '').toLowerCase().slice(0, 2);
    return isLang(code) ? code : 'en';
  } catch {
    return 'bg';
  }
}

interface I18nValue {
  lang: Lang;
  tr: typeof tr;
}

const I18nContext = createContext<I18nValue>({ lang: 'bg', tr });

export function I18nProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  // Set during render on purpose: children render right after and their tr() calls must already see the new language.
  setLang(lang);
  const value = useMemo<I18nValue>(() => ({ lang, tr }), [lang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}
