import type { MealType } from '@/types';

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
  return new Date(iso).toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' });
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
const WEEKDAYS_LONG = ['неделя', 'понеделник', 'вторник', 'сряда', 'четвъртък', 'петък', 'събота'];

export function weekdayShort(dateKey: string): string {
  return WEEKDAYS[dateOf(dateKey).getDay()];
}

export function shortDate(dateKey: string): string {
  const [, m, d] = dateKey.split('-');
  return `${Number(d)}.${m}`;
}

export function formatDateLabel(dateKey: string): string {
  const today = todayKey();
  if (dateKey === today) return 'Днес';
  if (dateKey === shiftDateKey(today, -1)) return 'Вчера';
  if (dateKey === shiftDateKey(today, 1)) return 'Утре';
  return dateOf(dateKey).toLocaleDateString('bg-BG', { day: 'numeric', month: 'long' });
}

export function formatLongDate(dateKey: string): string {
  const d = dateOf(dateKey);
  return `${WEEKDAYS_LONG[d.getDay()]}, ${d.toLocaleDateString('bg-BG', { day: 'numeric', month: 'long', year: 'numeric' })}`;
}

export const MEALS: { key: MealType; label: string; emoji: string }[] = [
  { key: 'breakfast', label: 'Закуска', emoji: '🌅' },
  { key: 'lunch', label: 'Обяд', emoji: '☀️' },
  { key: 'dinner', label: 'Вечеря', emoji: '🌙' },
  { key: 'snack', label: 'Междинно', emoji: '🍏' },
];

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
  return n.toLocaleString('bg-BG', { maximumFractionDigits: decimals, minimumFractionDigits: 0 });
}
