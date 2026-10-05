import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSQLiteContext } from 'expo-sqlite';
import type { UserProfile } from '@/types';
import { useSettings } from '@/context/SettingsContext';
import { useDataRefresh } from '@/context/DataRefreshContext';
import { upsertWeightEntry } from '@/db/queries';
import { getDiet, type DietId } from '@/data/diets';
import { computeMetrics } from '@/utils/bodyMetrics';
import { todayKey } from '@/utils/date';

const PROFILE_KEY = 'azqm_profile_v1';

interface ProfileContextValue {
  loaded: boolean;
  profile: UserProfile | null;
  /** Saves the profile (and optionally a new diet), logs today's weight and recomputes the daily goals. */
  saveProfile: (profile: UserProfile, dietId?: DietId) => Promise<void>;
  /** Updates only the current weight (from the weight log); goals are left alone. */
  updateWeight: (weightKg: number) => Promise<void>;
  /** Switches the diet: recomputes goals from the profile and applies the diet's fasting window. */
  applyDiet: (dietId: DietId) => Promise<void>;
  /** Replaces the stored profile as-is (restoring a backup). */
  restoreProfile: (profile: UserProfile | null) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const { update, dietId: currentDiet, fastingGoalHours } = useSettings();
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
    async (next: UserProfile, dietId?: DietId) => {
      const diet = getDiet(dietId ?? currentDiet);
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(next));
      await upsertWeightEntry(db, todayKey(), next.weightKg);
      await update({
        dietId: diet.id,
        goals: computeMetrics(next, diet).goals,
        fastingGoalHours: dietId && diet.fastingHours ? diet.fastingHours : fastingGoalHours,
      });
      setProfile(next);
      bump();
    },
    [db, update, bump, currentDiet, fastingGoalHours]
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

  const applyDiet = useCallback(
    async (dietId: DietId) => {
      const diet = getDiet(dietId);
      await update({
        dietId,
        ...(profile ? { goals: computeMetrics(profile, diet).goals } : null),
        ...(diet.fastingHours ? { fastingGoalHours: diet.fastingHours } : null),
      });
    },
    [profile, update]
  );

  const restoreProfile = useCallback(async (next: UserProfile | null) => {
    if (next) await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(next));
    else await AsyncStorage.removeItem(PROFILE_KEY);
    setProfile(next);
  }, []);

  const value = useMemo<ProfileContextValue>(
    () => ({ loaded, profile, saveProfile, updateWeight, applyDiet, restoreProfile }),
    [loaded, profile, saveProfile, updateWeight, applyDiet, restoreProfile]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile трябва да се използва вътре в <ProfileProvider>.');
  return ctx;
}
