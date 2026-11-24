import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { DailyGoals, VisionProvider } from '@/types';
import type { DietId } from '@/data/diets';
import type { TextScaleKey, ThemePref } from '@/theme/ThemeContext';
import { DEFAULT_THEME_ID, isThemeId, type ThemeId } from '@/theme/themes';
import { LOOK_VERSION, migrateLook } from '@/theme/lookMigration';
import { deviceLang, isLang, type Lang } from '@/i18n';

const SETTINGS_KEY = 'azqm_settings_v1';
// expo-secure-store, not AsyncStorage: this is a credential, not app state.
const API_KEY_STORE_KEY = 'azqm_vision_api_key_v1';

export interface AppSettings {
  dietId: DietId;
  goals: DailyGoals;
  /** colours, fonts and shapes (Настройки → Теми); Pro themes fall back to the free default without Pro */
  themeId: ThemeId;
  /** dark / light / system — for the Classic theme */
  themePref: ThemePref;
  textScale: TextScaleKey;
  language: Lang;
  fastingGoalHours: number;
  visionProvider: VisionProvider;
  visionModel: string;
  /** 2 = the 24.11.2026 redesign has been applied to these settings once (src/theme/lookMigration.ts) */
  lookVersion: number;
  /** the one-time "new look" note on Today, until the user keeps the new look or goes back */
  showLookNote: boolean;
}

export function defaultModelFor(provider: VisionProvider): string {
  return provider === 'openai' ? 'gpt-4o-mini' : 'gemini-2.5-flash';
}

const DEFAULTS: AppSettings = {
  dietId: 'keto',
  goals: { calories: 1800, protein: 110, fat: 140, carbs: 25 },
  themeId: DEFAULT_THEME_ID,
  themePref: 'system',
  textScale: 'normal',
  language: 'bg',
  fastingGoalHours: 16,
  visionProvider: 'gemini',
  visionModel: defaultModelFor('gemini'),
  lookVersion: LOOK_VERSION,
  showLookNote: false,
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
          const saved = JSON.parse(stored);
          const next: AppSettings = { ...DEFAULTS, ...saved };
          if (!isLang(next.language)) next.language = deviceLang();
          // Before themes (1.5.0) there was only dark / light: whoever picked light keeps it in the Classic theme,
          // everyone else gets the new default.
          if (!isThemeId(saved.themeId)) next.themeId = next.themePref === 'light' ? 'classic' : DEFAULT_THEME_ID;
          // The 24.11.2026 redesign: the old default moves to Deep Glass once, with a note on Today. Saved right away,
          // so it never runs again and going back to the old look sticks.
          const look = migrateLook(saved);
          if (look.themeId) next.themeId = look.themeId;
          next.lookVersion = look.lookVersion;
          next.showLookNote = look.showLookNote || saved.showLookNote === true;
          latest.current = next;
          setSettings(next);
          if (saved.lookVersion !== LOOK_VERSION) await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next)).catch(() => undefined);
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
