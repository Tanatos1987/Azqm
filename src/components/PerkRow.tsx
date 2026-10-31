import React from 'react';
import { View } from 'react-native';
import { Row, Txt } from '@/components/ui';
import type { Perk } from '@/data/pro';

/** Emoji, title and a line of text — the lists of the support screen, the support wizard and Help. */
export function PerkRow({ emoji, title, text }: Perk) {
  return (
    <Row gap={12} style={{ alignItems: 'flex-start' }}>
      <Txt style={{ fontSize: 22, width: 30 }}>{emoji}</Txt>
      <View style={{ flex: 1 }}>
        <Txt v="bodyStrong">{title}</Txt>
        <Txt v="small" tone="textMuted">
          {text}
        </Txt>
      </View>
    </Row>
  );
}
