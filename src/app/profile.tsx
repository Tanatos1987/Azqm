import React from 'react';
import { router } from 'expo-router';
import { IconButton, Screen } from '@/components/ui';
import { CloseIcon } from '@/components/icons';
import { ProfileForm } from '@/components/profile/ProfileForm';
import { useProfile } from '@/context/ProfileContext';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme/ThemeContext';

export default function ProfileScreen() {
  const t = useTheme();
  const { tr } = useI18n();
  const { profile } = useProfile();
  return (
    <Screen
      title={tr('Профил', 'Profile')}
      subtitle={tr('Промяната преизчислява дневните цели', 'Changes recalculate your daily goals')}
      right={
        <IconButton onPress={() => router.back()} accessibilityLabel={tr('Затвори', 'Close')}>
          <CloseIcon size={22} color={t.c.text} />
        </IconButton>
      }
    >
      <ProfileForm initial={profile} onSaved={() => router.back()} />
    </Screen>
  );
}
