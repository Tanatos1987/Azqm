/**
 * Reminders (Pro): local notifications scheduled on the phone — no server, no push, nothing leaves the device.
 * Daily ones (weigh-in, water every few hours in a window, logging food) and a one-off when the running fast reaches
 * its goal. The settings live in AsyncStorage; every change, a language switch and the Pro state reschedule them, so
 * the texts follow the language and a refund turns them off. Android may deliver them a few minutes late (no exact
 * alarms, which would need an extra permission).
 */
import { Platform } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { getActiveFast } from '@/db/queries';
import { tr } from '@/i18n';

const KEY = 'azqm.reminders';
const CHANNEL = 'reminders';
const FAST_ID = 'fast-end';

export interface ReminderSettings {
  weighIn: { on: boolean; time: string };
  water: { on: boolean; from: string; to: string; everyHours: number };
  meals: { on: boolean; times: string[] };
  fastEnd: { on: boolean };
}

export const DEFAULT_REMINDERS: ReminderSettings = {
  weighIn: { on: false, time: '07:30' },
  water: { on: false, from: '09:00', to: '21:00', everyHours: 2 },
  meals: { on: false, times: ['13:00', '20:00'] },
  fastEnd: { on: false },
};

// Shown while the app is open too.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

/** The Pro teaser of the reminders (Settings and the locked screen). */
export function remindersTeaser(): string {
  return tr(
    'Напомняния за претегляне, вода, записване на храната и края на поста — от самия телефон.',
    'Reminders to weigh in, drink water, log your food and end your fast — from the phone itself.'
  );
}

export async function loadReminders(): Promise<ReminderSettings> {
  try {
    const stored = JSON.parse((await AsyncStorage.getItem(KEY)) ?? '{}') as Partial<ReminderSettings>;
    return {
      weighIn: { ...DEFAULT_REMINDERS.weighIn, ...stored.weighIn },
      water: { ...DEFAULT_REMINDERS.water, ...stored.water },
      meals: { ...DEFAULT_REMINDERS.meals, ...stored.meals },
      fastEnd: { ...DEFAULT_REMINDERS.fastEnd, ...stored.fastEnd },
    };
  } catch {
    return DEFAULT_REMINDERS;
  }
}

export async function saveReminders(s: ReminderSettings) {
  await AsyncStorage.setItem(KEY, JSON.stringify(s));
}

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL, { name: tr('Напомняния', 'Reminders'), importance: Notifications.AndroidImportance.HIGH });
}

/** Asks for the notification permission (the system prompt on Android 13+); false when it is refused. */
export async function ensurePermission(): Promise<boolean> {
  // Android only shows the prompt once the app has a notification channel.
  await ensureChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

export async function hasPermission(): Promise<boolean> {
  return (await Notifications.getPermissionsAsync()).granted;
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
export const fromMinutes = (total: number) => {
  const t = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};

/** The water reminder times: from `from` to `to`, every `everyHours`. */
export function waterTimes(w: ReminderSettings['water']): string[] {
  const out: string[] = [];
  const end = toMinutes(w.to);
  for (let m = toMinutes(w.from); m <= end && out.length < 24; m += Math.max(1, w.everyHours) * 60) out.push(fromMinutes(m));
  return out;
}

/** Cancels the daily reminders and schedules them again from the settings (the fasting one is left alone). */
export async function scheduleDaily(s: ReminderSettings, isPro: boolean) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled.filter((n) => n.identifier !== FAST_ID).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
  if (!isPro || !(s.weighIn.on || s.water.on || s.meals.on) || !(await hasPermission())) return;
  await ensureChannel();
  const daily = (identifier: string, title: string, body: string, hhmm: string, url: string) =>
    Notifications.scheduleNotificationAsync({
      identifier,
      content: { title, body, data: { url } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: Math.floor(toMinutes(hhmm) / 60), minute: toMinutes(hhmm) % 60, channelId: CHANNEL },
    });
  if (s.weighIn.on) {
    await daily('weigh', tr('Време за кантара ⚖️', 'Time to weigh in ⚖️'), tr('Претегли се преди закуска и запиши теглото в Azqm.', 'Weigh yourself before breakfast and log it in Azqm.'), s.weighIn.time, '/progress');
  }
  if (s.water.on) {
    for (const time of waterTimes(s.water)) {
      await daily(`water-${time}`, tr('Чаша вода 💧', 'A glass of water 💧'), tr('Пийни вода и я добави с „+ 250 мл“.', 'Have some water and log it with “+ 250 ml”.'), time, '/');
    }
  }
  if (s.meals.on) {
    for (const time of s.meals.times) {
      await daily(`meal-${time}`, tr('Запиши храната 🍽️', 'Log your food 🍽️'), tr('Добави храната, докато я помниш.', 'Add what you’ve eaten while you remember it.'), time, '/add');
    }
  }
}

/** Puts the "fasting goal reached" notification on the running fast's goal time, or takes it away. */
export async function syncFastReminder(db: SQLiteDatabase, s: ReminderSettings, isPro: boolean) {
  await Notifications.cancelScheduledNotificationAsync(FAST_ID).catch(() => {});
  if (!isPro || !s.fastEnd.on) return;
  const fast = await getActiveFast(db);
  if (!fast) return;
  const at = new Date(new Date(fast.startIso).getTime() + fast.goalHours * 3600000);
  if (at.getTime() <= Date.now() || !(await hasPermission())) return;
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    identifier: FAST_ID,
    content: {
      title: tr('Целта на поста е постигната! 🎉', 'Fasting goal reached! 🎉'),
      body: tr('{h} часа пост. Прекрати го от раздел „Пост“, когато решиш.', '{h} hours of fasting. End it in the “Fasting” tab when you’re ready.', { h: fast.goalHours }),
      data: { url: '/fasting' },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL },
  });
}
