import type { MealType } from '@/types';
import { getLang, tr, type Lang } from '@/i18n';

/*
 * Dates and numbers are formatted by hand, not with toLocaleString / Intl: Hermes on Android builds a new
 * Java formatter on every such call, and a food list or the Анализ tab makes hundreds of them per render,
 * which made switching tabs slow. Output matches Intl for every app language (checked against Node's ICU).
 */

/** Month names as used after a day number (Russian genitive), weekdays from Sunday, and short weekdays for charts. */
const DATE_WORDS: Record<Lang, { months: string[]; weekdays: string[]; weekdaysShort: string[] }> = {
  bg: {
    months: ['януари', 'февруари', 'март', 'април', 'май', 'юни', 'юли', 'август', 'септември', 'октомври', 'ноември', 'декември'],
    weekdays: ['неделя', 'понеделник', 'вторник', 'сряда', 'четвъртък', 'петък', 'събота'],
    weekdaysShort: ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
  },
  en: {
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    weekdaysShort: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
  },
  de: {
    months: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
    weekdays: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
    weekdaysShort: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
  },
  es: {
    months: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
    weekdays: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
    weekdaysShort: ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'],
  },
  fr: {
    months: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
    weekdays: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
    weekdaysShort: ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'],
  },
  it: {
    months: ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'],
    weekdays: ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'],
    weekdaysShort: ['Do', 'Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa'],
  },
  ru: {
    months: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
    weekdays: ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'],
    weekdaysShort: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
  },
  tr: {
    months: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
    weekdays: ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'],
    weekdaysShort: ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'],
  },
};

const words = () => DATE_WORDS[getLang()] ?? DATE_WORDS.en;

/** "3 октомври", "3. Oktober", "3 de octubre"; with the year "3 октомври 2026 г.", "3 de octubre de 2026". */
export function formatDayMonth(d: Date, withYear = false): string {
  const day = d.getDate();
  const month = words().months[d.getMonth()];
  const year = d.getFullYear();
  switch (getLang()) {
    case 'bg':
    case 'ru':
      return withYear ? `${day} ${month} ${year} г.` : `${day} ${month}`;
    case 'de':
      return withYear ? `${day}. ${month} ${year}` : `${day}. ${month}`;
    case 'es':
      return withYear ? `${day} de ${month} de ${year}` : `${day} de ${month}`;
    default:
      return withYear ? `${day} ${month} ${year}` : `${day} ${month}`;
  }
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

/** 24-hour "21:08" (every app language uses the 24-hour clock). */
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

export function weekdayShort(dateKey: string): string {
  return words().weekdaysShort[dateOf(dateKey).getDay()];
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

/** "вторник, 13 януари 2026 г.", "mardi 13 janvier 2026", "13 Ocak 2026 Salı". */
export function formatLongDate(dateKey: string): string {
  const d = dateOf(dateKey);
  const weekday = words().weekdays[d.getDay()];
  const date = formatDayMonth(d, true);
  switch (getLang()) {
    case 'tr':
      return `${date} ${weekday}`;
    case 'fr':
    case 'it':
      return `${weekday} ${date}`;
    default:
      return `${weekday}, ${date}`;
  }
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

/** Decimal mark, thousands separator and the integer length where grouping starts (CLDR minimumGroupingDigits). */
const NUMBER_FORMAT: Record<Lang, { decimal: string; group: string; groupFrom: number }> = {
  bg: { decimal: ',', group: '\u00a0', groupFrom: 5 },
  en: { decimal: '.', group: ',', groupFrom: 4 },
  de: { decimal: ',', group: '.', groupFrom: 4 },
  es: { decimal: ',', group: '.', groupFrom: 5 },
  fr: { decimal: ',', group: '\u202f', groupFrom: 4 },
  it: { decimal: ',', group: '.', groupFrom: 5 },
  ru: { decimal: ',', group: '\u00a0', groupFrom: 4 },
  tr: { decimal: ',', group: '.', groupFrom: 4 },
};

/**
 * Like toLocaleString(locale, { maximumFractionDigits: decimals, minimumFractionDigits: minDecimals }):
 * "1234,5" and "10 000" in Bulgarian, "1,234.5" in English, "1.234,5" in German.
 */
export function formatNumber(n: number, decimals = 0, minDecimals = 0): string {
  if (!Number.isFinite(n)) return String(n);
  const f = NUMBER_FORMAT[getLang()] ?? NUMBER_FORMAT.en;
  const abs = Math.abs(n);
  // Round half away from zero on the shortest decimal form, as Intl does ("4.35" → 4.4, not 4.3).
  // (String() of numbers below 1e-6 or from 1e21 switches to exponent form, so those skip the trick.)
  const rounded = abs < 1e-6 ? 0 : abs >= 1e21 ? abs : Number(`${Math.round(Number(`${abs}e${decimals}`))}e-${decimals}`);
  let [int, frac = ''] = rounded.toFixed(decimals).split('.');
  frac = frac.replace(/0+$/, '');
  if (frac.length < minDecimals) frac = frac.padEnd(minDecimals, '0');
  if (int.length >= f.groupFrom) int = int.replace(/\B(?=(\d{3})+$)/g, f.group);
  const sign = n < 0 && rounded !== 0 ? '-' : '';
  return `${sign}${int}${frac ? f.decimal + frac : ''}`;
}
