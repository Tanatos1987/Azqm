import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Badge, Button, Card, Row, Txt } from '@/components/ui';
import { LockIcon } from '@/components/icons';
import { useTheme } from '@/theme/ThemeContext';
import { useI18n } from '@/i18n';

/** Shown in place of a Pro feature: what it does and the way to the support screen that unlocks it. */
export function ProLock({ emoji, title, text }: { emoji: string; title: string; text: string }) {
  const t = useTheme();
  const { tr } = useI18n();
  return (
    <Card style={{ gap: 12 }}>
      <Row gap={12}>
        <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: t.c.accentSoft }}>
          <Txt style={{ fontSize: 24 }}>{emoji}</Txt>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Row gap={8}>
            <Txt v="h3" style={{ flexShrink: 1 }}>
              {title}
            </Txt>
            <Badge label="Pro" color={t.c.accent} soft={t.c.accentSoft} />
          </Row>
          <Txt v="small" tone="textMuted">
            {text}
          </Txt>
        </View>
      </Row>
      <Button label={tr('Отключи с подкрепа за Azqm', 'Unlock by supporting Azqm')} icon={<LockIcon size={20} color={t.c.onAccent} />} onPress={() => router.push('/support')} />
    </Card>
  );
}
