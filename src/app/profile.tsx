import React from 'react';
import { router } from 'expo-router';
import { IconButton, Screen } from '@/components/ui';
import { CloseIcon } from '@/components/icons';
import { ProfileForm } from '@/components/profile/ProfileForm';
import { useProfile } from '@/context/ProfileContext';
import { useTheme } from '@/theme/ThemeContext';

export default function ProfileScreen() {
  const t = useTheme();
  const { profile } = useProfile();
  return (
    <Screen
      title="Профил"
      subtitle="Промяната преизчислява дневните цели"
      right={
        <IconButton onPress={() => router.back()} accessibilityLabel="Затвори">
          <CloseIcon size={22} color={t.c.text} />
        </IconButton>
      }
    >
      <ProfileForm initial={profile} onSaved={() => router.back()} />
    </Screen>
  );
}
