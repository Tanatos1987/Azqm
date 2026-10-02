import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const START_KEY = 'fasting_start_iso_v1';

export function useFastingTimer(goalHours: number) {
  const [startIso, setStartIso] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    AsyncStorage.getItem(START_KEY).then((v) => {
      setStartIso(v);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const start = useCallback(async () => {
    const iso = new Date().toISOString();
    setStartIso(iso);
    await AsyncStorage.setItem(START_KEY, iso);
  }, []);

  const stop = useCallback(async () => {
    setStartIso(null);
    await AsyncStorage.removeItem(START_KEY);
  }, []);

  const elapsedMs = startIso ? now - new Date(startIso).getTime() : 0;
  const goalMs = goalHours * 60 * 60 * 1000;
  const progress = startIso ? Math.min(elapsedMs / goalMs, 1) : 0;
  const isFasting = Boolean(startIso);
  const isGoalReached = isFasting && elapsedMs >= goalMs;

  return { ready, isFasting, startIso, elapsedMs, goalMs, progress, isGoalReached, start, stop };
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
