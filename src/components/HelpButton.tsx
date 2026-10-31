import React from 'react';
import { router } from 'expo-router';
import { IconButton } from '@/components/ui';
import { HelpIcon } from '@/components/icons';
import type { HelpSection } from '@/data/help';
import { useTheme } from '@/theme/ThemeContext';
import { useI18n } from '@/i18n';

/** "?" in a tab's header: opens Help at that tab's part. */
export function HelpButton({ section }: { section: HelpSection['key'] }) {
  const t = useTheme();
  const { tr } = useI18n();
  return (
    <IconButton onPress={() => router.push({ pathname: '/help', params: { section } })} accessibilityLabel={tr('Помощ', 'Help')}>
      <HelpIcon size={22} color={t.c.text} />
    </IconButton>
  );
}
