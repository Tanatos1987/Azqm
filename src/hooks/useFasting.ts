import { useCallback, useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { useDataRefresh } from '@/context/DataRefreshContext';
import { useSettings } from '@/context/SettingsContext';
import { endFast, getActiveFast, setFastGoal, startFast } from '@/db/queries';
import type { FastRecord } from '@/types';

/** The running fast (stored in SQLite, so it survives restarts) plus a ticking clock. */
export function useFasting(tickMs = 1000) {
  const db = useSQLiteContext();
  const { version, bump } = useDataRefresh();
  const { fastingGoalHours } = useSettings();
  const [active, setActive] = useState<FastRecord | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    getActiveFast(db).then(setActive);
  }, [db, version]);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), tickMs);
    return () => clearInterval(id);
  }, [active, tickMs]);

  /** Starts a fast now, or `hoursAgo` hours back (counting from the last meal). */
  const start = useCallback(
    async (hoursAgo = 0) => {
      await startFast(db, fastingGoalHours, new Date(Date.now() - hoursAgo * 3600000).toISOString());
      setNow(Date.now());
      bump();
    },
    [db, fastingGoalHours, bump]
  );

  const stop = useCallback(async () => {
    if (!active) return;
    await endFast(db, active.id);
    bump();
  }, [db, active, bump]);

  const changeGoal = useCallback(
    async (hours: number) => {
      if (!active) return;
      await setFastGoal(db, active.id, hours);
      bump();
    },
    [db, active, bump]
  );

  const goalHours = active?.goalHours ?? fastingGoalHours;
  const elapsedMs = active ? Math.max(now - new Date(active.startIso).getTime(), 0) : 0;
  const goalMs = goalHours * 3600 * 1000;
  return {
    active,
    isFasting: active != null,
    elapsedMs,
    goalHours,
    progress: active ? Math.min(elapsedMs / goalMs, 1) : 0,
    isGoalReached: active != null && elapsedMs >= goalMs,
    remainingMs: Math.max(goalMs - elapsedMs, 0),
    start,
    stop,
    changeGoal,
  };
}

export function formatDuration(ms: number, withSeconds = true): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return withSeconds ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${h} ч ${pad(m)} мин`;
}

/** Commonly described stages of a fast (approximate — they vary from person to person). */
export const FAST_STAGES: { hours: number; title: string; text: string }[] = [
  { hours: 0, title: 'Храносмилане', text: 'Тялото използва енергията от последното хранене.' },
  { hours: 8, title: 'Спад на инсулина', text: 'Кръвната захар и инсулинът се понижават, започва използване на гликогена.' },
  { hours: 12, title: 'Изгаряне на мазнини', text: 'Гликогенът намалява и делът на изгорените мазнини расте.' },
  { hours: 16, title: 'Начало на кетоза', text: 'Черният дроб образува повече кетони.' },
  { hours: 24, title: 'Дълбока кетоза', text: 'Кетоните са важен източник на енергия; засилва се автофагията.' },
  { hours: 48, title: 'Продължително гладуване', text: 'Следи електролитите и самочувствието; над 48 ч — само с лекар.' },
  { hours: 72, title: '3 дни', text: 'Прекъсни внимателно: бульон, зеленчуци, малки порции.' },
];
