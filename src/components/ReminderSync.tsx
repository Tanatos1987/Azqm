import { useEffect } from 'react';
import { router, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import * as Notifications from 'expo-notifications';
import { useDataRefresh } from '@/context/DataRefreshContext';
import { usePro } from '@/context/ProContext';
import { loadReminders, scheduleDaily, syncFastReminder } from '@/utils/reminders';
import { useI18n } from '@/i18n';

/**
 * Keeps the scheduled reminders in step (renders nothing): the daily ones follow the language and the Pro state,
 * the fasting one also every data change (a fast started, ended or given a new goal). Tapping a reminder opens its tab.
 */
export function ReminderSync() {
  const db = useSQLiteContext();
  const { lang } = useI18n();
  const { isPro, loaded } = usePro();
  const { version } = useDataRefresh();

  useEffect(() => {
    if (!loaded) return;
    loadReminders()
      .then((s) => scheduleDaily(s, isPro))
      .catch(() => {});
  }, [lang, isPro, loaded]);

  useEffect(() => {
    if (!loaded) return;
    loadReminders()
      .then((s) => syncFastReminder(db, s, isPro))
      .catch(() => {});
  }, [db, version, lang, isPro, loaded]);

  useEffect(() => {
    const open = (r: Notifications.NotificationResponse | null) => {
      const url = r?.notification.request.content.data?.url;
      if (typeof url === 'string') router.navigate(url as Href);
    };
    // A reminder that started the app, then the ones tapped while it runs.
    Notifications.getLastNotificationResponseAsync()
      .then((r) => {
        open(r);
        return Notifications.clearLastNotificationResponseAsync();
      })
      .catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, []);

  return null;
}
