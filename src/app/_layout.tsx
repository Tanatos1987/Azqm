import React, { useEffect } from 'react';
import { Dimensions } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import { SQLiteProvider } from 'expo-sqlite';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { migrateDbIfNeeded } from '@/db/schema';
import { SettingsProvider, useSettings } from '@/context/SettingsContext';
import { DataRefreshProvider } from '@/context/DataRefreshContext';
import { ProfileProvider, useProfile } from '@/context/ProfileContext';
import { SelectedDateProvider } from '@/context/SelectedDateContext';
import { ToastProvider } from '@/context/ToastContext';
import { ThemeProvider, useTheme } from '@/theme/ThemeContext';
import { I18nProvider } from '@/i18n';

/**
 * Phones stay in portrait; tablets and unfolded foldables (shorter side of the display ≥ 600 dp) rotate freely.
 * The lock is set at runtime, not with `orientation` in app.json: a manifest lock is what Google Play flags for
 * large screens, and Android 16 ignores it there anyway.
 */
function applyOrientationPolicy() {
  const { width, height } = Dimensions.get('screen');
  const lock = Math.min(width, height) < 600 ? ScreenOrientation.OrientationLock.PORTRAIT_UP : ScreenOrientation.OrientationLock.DEFAULT;
  ScreenOrientation.lockAsync(lock).catch(() => {});
}

export default function RootLayout() {
  useEffect(() => {
    applyOrientationPolicy();
    // Folding / unfolding changes the display size.
    const sub = Dimensions.addEventListener('change', applyOrientationPolicy);
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName="azqm.db" onInit={migrateDbIfNeeded}>
        <SettingsProvider>
          <LanguageGate>
            <ThemeProvider>
              <DataRefreshProvider>
                <ProfileProvider>
                  <SelectedDateProvider>
                    <ToastProvider>
                      <RootNavigator />
                    </ToastProvider>
                  </SelectedDateProvider>
                </ProfileProvider>
              </DataRefreshProvider>
            </ThemeProvider>
          </LanguageGate>
        </SettingsProvider>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}

function LanguageGate({ children }: { children: React.ReactNode }) {
  const { language } = useSettings();
  return <I18nProvider lang={language}>{children}</I18nProvider>;
}

function RootNavigator() {
  const t = useTheme();
  const settings = useSettings();
  const { loaded, profile } = useProfile();
  // Render nothing until stored state is read, so onboarding doesn't flash for existing users.
  if (!loaded || !settings.loaded) return null;
  const hasProfile = profile !== null;

  return (
    <>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: t.c.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Protected guard={hasProfile}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="diet" />
          <Stack.Screen name="profile" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        </Stack.Protected>
        <Stack.Protected guard={!hasProfile}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
