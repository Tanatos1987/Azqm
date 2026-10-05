import type { MealType } from '@/types';
import { locale, tr } from '@/i18n';

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

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' });
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
  return dateOf(dateKey).toLocaleDateString(locale(), { day: 'numeric', month: 'long' });
}

export function formatLongDate(dateKey: string): string {
  const d = dateOf(dateKey);
  const day = d.getDay();
  return `${tr(WEEKDAYS_LONG[day], WEEKDAYS_LONG_EN[day])}, ${d.toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' })}`;
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

export function formatNumber(n: number, decimals = 0): string {
  return n.toLocaleString(locale(), { maximumFractionDigits: decimals, minimumFractionDigits: 0 });
}
