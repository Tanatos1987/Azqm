import type { MealType } from '@/types';
import { getLang, tr } from '@/i18n';

/*
 * Dates and numbers are formatted by hand, not with toLocaleString / Intl: Hermes on Android builds a new
 * Java formatter on every such call, and a food list or the Анализ tab makes hundreds of them per render,
 * which made switching tabs slow. Output matches Intl for bg-BG / en-GB.
 */

const MONTHS = ['януари', 'февруари', 'март', 'април', 'май', 'юни', 'юли', 'август', 'септември', 'октомври', 'ноември', 'декември'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "3 октомври" / "3 October", with the year: "3 октомври 2026 г." / "3 October 2026". */
export function formatDayMonth(d: Date, withYear = false): string {
  const m = d.getMonth();
  const base = `${d.getDate()} ${tr(MONTHS[m], MONTHS_EN[m])}`;
  return withYear ? `${base} ${d.getFullYear()}${tr(' г.', '')}` : base;
}

export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function dateOf(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** 24-hour "21:08" (both languages). */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function shiftDateKey(dateKey: string, deltaDays: number): string {
  const date = dateOf(dateKey);
  date.setDate(date.getDate() + deltaDays);
  return todayKey(date);
}

export function daysBetween(fromKey: string, toKey: string): number {
  return Math.round((dateOf(toKey).getTime() - dateOf(fromKey).getTime()) / 86400000);
}

const WEEKDAYS = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const WEEKDAYS_EN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const WEEKDAYS_LONG = ['неделя', 'понеделник', 'вторник', 'сряда', 'четвъртък', 'петък', 'събота'];
const WEEKDAYS_LONG_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function weekdayShort(dateKey: string): string {
  const i = dateOf(dateKey).getDay();
  return tr(WEEKDAYS[i], WEEKDAYS_EN[i]);
}

export function shortDate(dateKey: string): string {
  const [, m, d] = dateKey.split('-');
  return `${Number(d)}.${m}`;
}

export function formatDateLabel(dateKey: string): string {
  const today = todayKey();
  if (dateKey === today) return tr('Днес', 'Today');
  if (dateKey === shiftDateKey(today, -1)) return tr('Вчера', 'Yesterday');
  if (dateKey === shiftDateKey(today, 1)) return tr('Утре', 'Tomorrow');
  return formatDayMonth(dateOf(dateKey));
}

export function formatLongDate(dateKey: string): string {
  const d = dateOf(dateKey);
  const day = d.getDay();
  return `${tr(WEEKDAYS_LONG[day], WEEKDAYS_LONG_EN[day])}, ${formatDayMonth(d, true)}`;
}

export const MEALS: { key: MealType; readonly label: string; emoji: string }[] = (
  [
    ['breakfast', 'Закуска', 'Breakfast', '🌅'],
    ['lunch', 'Обяд', 'Lunch', '☀️'],
    ['dinner', 'Вечеря', 'Dinner', '🌙'],
    ['snack', 'Междинно', 'Snack', '🍏'],
  ] as const
).map(([key, bg, en, emoji]) => ({
  key,
  emoji,
  get label() {
    return tr(bg, en);
  },
}));

export function mealLabel(meal: MealType): string {
  return MEALS.find((m) => m.key === meal)?.label ?? meal;
}

/** Meal suggested by the time of day. */
export function mealForNow(d: Date = new Date()): MealType {
  const h = d.getHours();
  if (h >= 5 && h < 11) return 'breakfast';
  if (h >= 11 && h < 16) return 'lunch';
  if (h >= 17 && h < 23) return 'dinner';
  return 'snack';
}

/** ISO time for a new entry: now when logging today, otherwise noon of that day. */
export function entryTimeIso(dateKey: string): string {
  if (dateKey === todayKey()) return new Date().toISOString();
  const d = dateOf(dateKey);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

/**
 * Like toLocaleString(bg-BG | en-GB, { maximumFractionDigits: decimals, minimumFractionDigits: minDecimals }):
 * "1234,5" and "10 000" in Bulgarian (grouping starts at 5 digits), "1,234.5" in English.
 */
export function formatNumber(n: number, decimals = 0, minDecimals = 0): string {
  if (!Number.isFinite(n)) return String(n);
  const en = getLang() === 'en';
  const abs = Math.abs(n);
  // Round half away from zero on the shortest decimal form, as Intl does ("4.35" → 4.4, not 4.3).
  // (String() of numbers below 1e-6 or from 1e21 switches to exponent form, so those skip the trick.)
  const rounded = abs < 1e-6 ? 0 : abs >= 1e21 ? abs : Number(`${Math.round(Number(`${abs}e${decimals}`))}e-${decimals}`);
  let [int, frac = ''] = rounded.toFixed(decimals).split('.');
  frac = frac.replace(/0+$/, '');
  if (frac.length < minDecimals) frac = frac.padEnd(minDecimals, '0');
  if (int.length >= (en ? 4 : 5)) int = int.replace(/\B(?=(\d{3})+$)/g, en ? ',' : '\u00a0');
  const sign = n < 0 && rounded !== 0 ? '-' : '';
  return `${sign}${int}${frac ? (en ? '.' : ',') + frac : ''}`;
}
