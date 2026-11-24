import React from 'react';
import { View } from 'react-native';
import { Row, Txt } from '@/components/ui';
import { LineIcon } from '@/components/LineIcon';
import type { Perk } from '@/data/pro';
import { useTheme } from '@/theme/ThemeContext';

/** Icon, title and a line of text — the lists of the support screen, the support wizard and Help. */
export function PerkRow({ icon, title, text }: Perk) {
  const t = useTheme();
  return (
    <Row gap={12} style={{ alignItems: 'flex-start' }}>
      <View style={{ width: 30, paddingTop: 1 }}>
        <LineIcon name={icon} size={22} color={t.c.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt v="bodyStrong">{title}</Txt>
        <Txt v="small" tone="textMuted">
          {text}
        </Txt>
      </View>
    </Row>
  );
}
