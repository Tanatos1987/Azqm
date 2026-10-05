import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
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

export default function RootLayout() {
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
