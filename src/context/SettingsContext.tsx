import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { DailyGoals, VisionProvider } from '@/types';

const GOALS_KEY = 'settings_goals_v1';
const PROVIDER_KEY = 'settings_vision_provider_v1';
const MODEL_KEY = 'settings_vision_model_v1';
const FASTING_GOAL_KEY = 'settings_fasting_goal_hours_v1';
// expo-secure-store, not AsyncStorage: this is a credential, not app state.
const API_KEY_STORE_KEY = 'vision_api_key_v1';

export const DEFAULT_GOALS: DailyGoals = {
  calories: 1800,
  protein: 110,
  fat: 140,
  netCarbs: 25,
};

export function defaultModelFor(provider: VisionProvider): string {
  return provider === 'openai' ? 'gpt-4o-mini' : 'gemini-2.5-flash';
}

interface SettingsContextValue {
  loaded: boolean;
  goals: DailyGoals;
  setGoals: (goals: DailyGoals) => Promise<void>;
  visionProvider: VisionProvider;
  setVisionProvider: (p: VisionProvider) => Promise<void>;
  visionModel: string;
  setVisionModel: (m: string) => Promise<void>;
  fastingGoalHours: number;
  setFastingGoalHours: (h: number) => Promise<void>;
  apiKey: string;
  hasApiKey: boolean;
  setApiKey: (key: string) => Promise<void>;
  clearApiKey: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [goals, setGoalsState] = useState<DailyGoals>(DEFAULT_GOALS);
  const [visionProvider, setVisionProviderState] = useState<VisionProvider>('gemini');
  const [visionModel, setVisionModelState] = useState<string>(defaultModelFor('gemini'));
  const [fastingGoalHours, setFastingGoalHoursState] = useState<number>(23);
  const [apiKey, setApiKeyState] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [storedGoals, storedProvider, storedModel, storedFastingGoal, storedKey] = await Promise.all([
          AsyncStorage.getItem(GOALS_KEY),
          AsyncStorage.getItem(PROVIDER_KEY),
          AsyncStorage.getItem(MODEL_KEY),
          AsyncStorage.getItem(FASTING_GOAL_KEY),
          SecureStore.getItemAsync(API_KEY_STORE_KEY),
        ]);
        if (storedGoals) setGoalsState(JSON.parse(storedGoals));
        const provider = (storedProvider as VisionProvider) || 'gemini';
        setVisionProviderState(provider);
        setVisionModelState(storedModel || defaultModelFor(provider));
        if (storedFastingGoal) setFastingGoalHoursState(Number(storedFastingGoal));
        if (storedKey) setApiKeyState(storedKey);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const setGoals = useCallback(async (next: DailyGoals) => {
    setGoalsState(next);
    await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(next));
  }, []);

  const setVisionProvider = useCallback(async (p: VisionProvider) => {
    setVisionProviderState(p);
    const nextModel = defaultModelFor(p);
    setVisionModelState(nextModel);
    await Promise.all([AsyncStorage.setItem(PROVIDER_KEY, p), AsyncStorage.setItem(MODEL_KEY, nextModel)]);
  }, []);

  const setVisionModel = useCallback(async (m: string) => {
    setVisionModelState(m);
    await AsyncStorage.setItem(MODEL_KEY, m);
  }, []);

  const setFastingGoalHours = useCallback(async (h: number) => {
    setFastingGoalHoursState(h);
    await AsyncStorage.setItem(FASTING_GOAL_KEY, String(h));
  }, []);

  const setApiKey = useCallback(async (key: string) => {
    setApiKeyState(key);
    await SecureStore.setItemAsync(API_KEY_STORE_KEY, key);
  }, []);

  const clearApiKey = useCallback(async () => {
    setApiKeyState('');
    await SecureStore.deleteItemAsync(API_KEY_STORE_KEY);
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({
      loaded,
      goals,
      setGoals,
      visionProvider,
      setVisionProvider,
      visionModel,
      setVisionModel,
      fastingGoalHours,
      setFastingGoalHours,
      apiKey,
      hasApiKey: apiKey.length > 0,
      setApiKey,
      clearApiKey,
    }),
    [
      loaded,
      goals,
      setGoals,
      visionProvider,
      setVisionProvider,
      visionModel,
      setVisionModel,
      fastingGoalHours,
      setFastingGoalHours,
      apiKey,
      setApiKey,
      clearApiKey,
    ]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings трябва да се използва вътре в <SettingsProvider>.');
  return ctx;
}
