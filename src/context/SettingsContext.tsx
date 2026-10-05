import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { DailyGoals, VisionProvider } from '@/types';
import type { DietId } from '@/data/diets';
import type { TextScaleKey, ThemePref } from '@/theme/ThemeContext';
import { deviceLang, type Lang } from '@/i18n';

const SETTINGS_KEY = 'azqm_settings_v1';
// expo-secure-store, not AsyncStorage: this is a credential, not app state.
const API_KEY_STORE_KEY = 'azqm_vision_api_key_v1';

export interface AppSettings {
  dietId: DietId;
  goals: DailyGoals;
  themePref: ThemePref;
  textScale: TextScaleKey;
  language: Lang;
  fastingGoalHours: number;
  visionProvider: VisionProvider;
  visionModel: string;
}

export function defaultModelFor(provider: VisionProvider): string {
  return provider === 'openai' ? 'gpt-4o-mini' : 'gemini-2.5-flash';
}

const DEFAULTS: AppSettings = {
  dietId: 'keto',
  goals: { calories: 1800, protein: 110, fat: 140, carbs: 25 },
  themePref: 'system',
  textScale: 'normal',
  language: 'bg',
  fastingGoalHours: 16,
  visionProvider: 'gemini',
  visionModel: defaultModelFor('gemini'),
};

interface SettingsContextValue extends AppSettings {
  loaded: boolean;
  update: (patch: Partial<AppSettings>) => Promise<void>;
  apiKey: string;
  hasApiKey: boolean;
  setApiKey: (key: string) => Promise<void>;
  clearApiKey: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const [apiKey, setApiKeyState] = useState('');
  // Latest value for sequential updates fired in the same tick.
  const latest = useRef(settings);

  useEffect(() => {
    (async () => {
      try {
        const [stored, storedKey] = await Promise.all([AsyncStorage.getItem(SETTINGS_KEY), SecureStore.getItemAsync(API_KEY_STORE_KEY)]);
        if (stored) {
          // Installs from before 1.1.0 have no language saved — they keep Bulgarian.
          const next = { ...DEFAULTS, ...JSON.parse(stored) };
          latest.current = next;
          setSettings(next);
        } else {
          const next = { ...DEFAULTS, language: deviceLang() };
          latest.current = next;
          setSettings(next);
        }
        if (storedKey) setApiKeyState(storedKey);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const update = useCallback(async (patch: Partial<AppSettings>) => {
    const next = { ...latest.current, ...patch };
    latest.current = next;
    setSettings(next);
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
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
    () => ({ ...settings, loaded, update, apiKey, hasApiKey: apiKey.length > 0, setApiKey, clearApiKey }),
    [settings, loaded, update, apiKey, setApiKey, clearApiKey]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>.');
  return ctx;
}
