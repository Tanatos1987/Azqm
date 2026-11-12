/**
 * Ratings in Google Play.
 *
 * `maybeAskForReview` shows Google's own in-app rating sheet (Play In-App Review API via expo-store-review) after a
 * happy moment — a food was just added — once the user clearly uses the app: at least REVIEW_MIN_DAYS days with
 * diary entries and REVIEW_AFTER_DAYS days since the first start with this feature. At most once per app start,
 * REVIEW_MAX_ASKS times in all, REVIEW_EVERY_DAYS apart. Google decides by itself whether the sheet really appears
 * (it has its own quota) and never tells the app what was chosen, so there is no "rate us 5 stars?" pre-question —
 * Google's rules forbid asking for a rating in a way that steers the answer.
 *
 * `openStorePage` / `shareApp` are for the rows in Settings (a button may open the store page, not the sheet).
 */
import { Linking, Share } from 'react-native';
import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SQLiteDatabase } from 'expo-sqlite';
import { getLoggedDayCount } from '@/db/queries';
import { PREVIEW } from '@/context/ProContext';
import { tr } from '@/i18n';
import { shiftDateKey, todayKey } from '@/utils/date';

export const PLAY_PACKAGE = 'com.tanatos.azqm';
export const PLAY_URL = `https://play.google.com/store/apps/details?id=${PLAY_PACKAGE}`;

const REVIEW_KEY = 'azqm.review';
const REVIEW_MIN_DAYS = 5;
const REVIEW_AFTER_DAYS = 4;
const REVIEW_EVERY_DAYS = 60;
const REVIEW_MAX_ASKS = 3;
/** Let the "Added …" toast show first. */
const REVIEW_DELAY_MS = 2500;

interface ReviewState {
  /** First day the app ran with this feature. */
  since: string;
  asks: number;
  lastAsk?: string;
  /** The user opened the store page from Settings — they found it themselves, don't ask again. */
  rated?: boolean;
}

let askedThisStart = false;

async function loadState(): Promise<ReviewState> {
  const stored = await AsyncStorage.getItem(REVIEW_KEY)
    .then((v) => (v ? (JSON.parse(v) as ReviewState) : null))
    .catch(() => null);
  if (stored?.since) return stored;
  const fresh: ReviewState = { since: todayKey(), asks: 0 };
  await saveState(fresh);
  return fresh;
}

function saveState(state: ReviewState) {
  return AsyncStorage.setItem(REVIEW_KEY, JSON.stringify(state)).catch(() => {});
}

/** Call after the user added something to the diary. Never throws, never blocks. */
export async function maybeAskForReview(db: SQLiteDatabase) {
  // Preview builds aren't installed from Google Play, so the sheet can't work there.
  if (PREVIEW || askedThisStart) return;
  try {
    const state = await loadState();
    const today = todayKey();
    if (state.rated || state.asks >= REVIEW_MAX_ASKS) return;
    if (shiftDateKey(state.since, REVIEW_AFTER_DAYS) > today) return;
    if (state.lastAsk && shiftDateKey(state.lastAsk, REVIEW_EVERY_DAYS) > today) return;
    if ((await getLoggedDayCount(db)) < REVIEW_MIN_DAYS) return;
    if (!(await StoreReview.isAvailableAsync())) return;
    askedThisStart = true;
    await saveState({ ...state, asks: state.asks + 1, lastAsk: today });
    setTimeout(() => {
      StoreReview.requestReview().catch(() => {});
    }, REVIEW_DELAY_MS);
  } catch {
    // A rating prompt is never worth an error on screen.
  }
}

/** Settings → "Rate Azqm": the app's page in the Play Store app (or the browser without it). */
export async function openStorePage() {
  loadState()
    .then((state) => saveState({ ...state, rated: true }))
    .catch(() => {});
  try {
    await Linking.openURL(`market://details?id=${PLAY_PACKAGE}&showAllReviews=true`);
  } catch {
    await Linking.openURL(`${PLAY_URL}&showAllReviews=true`).catch(() => {});
  }
}

/** Settings → "Recommend to a friend": the system share sheet with a short text and the Play link. */
export async function shareApp() {
  await Share.share({
    message: tr(
      'Пробвай Azqm — безплатен брояч на калории и макроси с 14 диети, гладуване и анализ на витамините: {url}',
      'Try Azqm, a free calorie and macro counter with 14 diets, fasting and a vitamin analysis: {url}',
      { url: PLAY_URL }
    ),
  }).catch(() => {});
}
