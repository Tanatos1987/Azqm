/**
 * Weight trend and goal forecast (Pro). The scale jumps by a kilo or more from day to day with water and food, so
 * the trend is an exponentially smoothed line — 10 % of the gap per day, as in "The Hacker's Diet"; a gap of several
 * days between weigh-ins counts as that many days. The pace is the slope of the trend over the last four weeks.
 */
import type { WeightEntry } from '@/types';
import { daysBetween, shiftDateKey } from './date';

const SMOOTHING = 0.1;
const RATE_WINDOW_DAYS = 28;
/** Weigh-ins must span at least this many days before a pace is shown. */
const MIN_SPAN_DAYS = 7;
/** Closer than this to the target counts as there. */
const REACHED_KG = 0.3;
/** Slower than this (kg/week) is "steady". */
const FLAT_KG_PER_WEEK = 0.05;
const MAX_FORECAST_DAYS = 3 * 365;

export interface TrendPoint {
  date: string;
  weightKg: number;
  trendKg: number;
}

/** The weigh-ins (oldest first) with the smoothed trend at each of them. */
export function weightTrend(weights: WeightEntry[]): TrendPoint[] {
  const out: TrendPoint[] = [];
  for (const w of weights) {
    const prev = out[out.length - 1];
    if (!prev) {
      out.push({ ...w, trendKg: w.weightKg });
      continue;
    }
    const gap = Math.max(1, daysBetween(prev.date, w.date));
    const k = 1 - Math.pow(1 - SMOOTHING, gap);
    out.push({ ...w, trendKg: prev.trendKg + k * (w.weightKg - prev.trendKg) });
  }
  return out;
}

export type ForecastStatus = 'noData' | 'noPace' | 'noTarget' | 'reached' | 'steady' | 'away' | 'far' | 'onTrack';

export interface WeightForecast {
  status: ForecastStatus;
  trendKg: number | null;
  /** kg per week, negative when losing; null until the weigh-ins of the last four weeks span a week */
  perWeek: number | null;
  /** when the trend reaches the target at this pace (status 'onTrack') */
  goalDate: string | null;
  weeksToGoal: number | null;
  /** losing more than 1 % of body weight a week */
  tooFast: boolean;
}

/** Least-squares slope of the trend over the last four weeks, in kg per week. */
function pacePerWeek(points: TrendPoint[]): number | null {
  const last = points[points.length - 1];
  const recent = points.filter((p) => daysBetween(p.date, last.date) <= RATE_WINDOW_DAYS);
  if (recent.length < 2 || daysBetween(recent[0].date, last.date) < MIN_SPAN_DAYS) return null;
  const xs = recent.map((p) => daysBetween(recent[0].date, p.date));
  const ys = recent.map((p) => p.trendKg);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let num = 0;
  let den = 0;
  xs.forEach((x, i) => {
    num += (x - mx) * (ys[i] - my);
    den += (x - mx) * (x - mx);
  });
  return den > 0 ? (num / den) * 7 : null;
}

export function forecastWeight(points: TrendPoint[], targetKg: number | null, today: string): WeightForecast {
  const none = { goalDate: null, weeksToGoal: null, tooFast: false };
  if (points.length === 0) return { status: 'noData', trendKg: null, perWeek: null, ...none };
  const trendKg = points[points.length - 1].trendKg;
  const perWeek = pacePerWeek(points);
  const tooFast = perWeek != null && perWeek < 0 && -perWeek > trendKg * 0.01;
  const base = { trendKg, perWeek, goalDate: null, weeksToGoal: null, tooFast };

  if (targetKg != null && Math.abs(targetKg - trendKg) < REACHED_KG) return { ...base, status: 'reached' };
  if (perWeek == null) return { ...base, status: 'noPace' };
  if (targetKg == null) return { ...base, status: 'noTarget' };
  if (Math.abs(perWeek) < FLAT_KG_PER_WEEK) return { ...base, status: 'steady' };
  // Moving away from the target (gaining while the target is lower, or losing while it is higher).
  if (Math.sign(targetKg - trendKg) !== Math.sign(perWeek)) return { ...base, status: 'away' };
  const days = Math.ceil(((targetKg - trendKg) / perWeek) * 7);
  if (days > MAX_FORECAST_DAYS) return { ...base, status: 'far' };
  return { ...base, status: 'onTrack', goalDate: shiftDateKey(today, days), weeksToGoal: Math.max(1, Math.round(days / 7)) };
}
