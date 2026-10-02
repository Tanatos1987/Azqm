import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSQLiteContext } from 'expo-sqlite';
import type { UserProfile } from '@/types';
import { useSettings } from '@/context/SettingsContext';
import { useDataRefresh } from '@/context/DataRefreshContext';
import { upsertWeightEntry } from '@/db/queries';
import { computeMetrics } from '@/utils/bodyMetrics';
import { todayKey } from '@/utils/date';

const PROFILE_KEY = 'user_profile_v1';

interface ProfileContextValue {
  loaded: boolean;
  profile: UserProfile | null;
  /** Saves the profile, logs today's weight and replaces the daily goals with the computed keto macros. */
  saveProfile: (profile: UserProfile) => Promise<void>;
  /** Updates only the current weight (from the weight log); goals are left alone. */
  updateWeight: (weightKg: number) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const { setGoals } = useSettings();
  const { bump } = useDataRefresh();
  const [loaded, setLoaded] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(PROFILE_KEY);
        if (stored) setProfile(JSON.parse(stored));
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const saveProfile = useCallback(
    async (next: UserProfile) => {
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(next));
      await upsertWeightEntry(db, todayKey(), next.weightKg);
      await setGoals(computeMetrics(next).goals);
      setProfile(next);
      bump();
    },
    [db, setGoals, bump]
  );

  const updateWeight = useCallback(
    async (weightKg: number) => {
      await upsertWeightEntry(db, todayKey(), weightKg);
      if (profile) {
        const next = { ...profile, weightKg };
        await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(next));
        setProfile(next);
      }
      bump();
    },
    [db, profile, bump]
  );

  const value = useMemo<ProfileContextValue>(
    () => ({ loaded, profile, saveProfile, updateWeight }),
    [loaded, profile, saveProfile, updateWeight]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile трябва да се използва вътре в <ProfileProvider>.');
  return ctx;
}
