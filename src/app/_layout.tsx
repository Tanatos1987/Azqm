import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { migrateDbIfNeeded } from '@/db/schema';
import { SettingsProvider, useSettings } from '@/context/SettingsContext';
import { DataRefreshProvider } from '@/context/DataRefreshContext';
import { ProfileProvider, useProfile } from '@/context/ProfileContext';
import { colors } from '@/theme/colors';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName="keto-omad.db" onInit={migrateDbIfNeeded}>
        <SettingsProvider>
          <DataRefreshProvider>
            <ProfileProvider>
              <StatusBar style="light" />
              <RootNavigator />
            </ProfileProvider>
          </DataRefreshProvider>
        </SettingsProvider>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const settings = useSettings();
  const { loaded, profile } = useProfile();
  // Render nothing until stored state is read, so onboarding doesn't flash for existing users.
  if (!loaded || !settings.loaded) return null;
  const hasProfile = profile !== null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Protected guard={hasProfile}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="profile" options={{ presentation: 'modal' }} />
      </Stack.Protected>
      <Stack.Protected guard={!hasProfile}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
    </Stack>
  );
}
