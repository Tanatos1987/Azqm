import React, { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Button, Card, Chip, IconButton, Row, Screen, Txt } from '@/components/ui';
import { ChevronLeftIcon, MinusIcon, PlusIcon } from '@/components/icons';
import { ProLock } from '@/components/ProLock';
import { usePro } from '@/context/ProContext';
import { makeStyles, useTheme } from '@/theme/ThemeContext';
import {
  DEFAULT_REMINDERS,
  ensurePermission,
  fromMinutes,
  loadReminders,
  permissionState,
  remindersTeaser,
  saveReminders,
  scheduleDaily,
  syncFastReminder,
  waterTimes,
  type ReminderSettings,
} from '@/utils/reminders';
import { useI18n } from '@/i18n';

const STEP_MIN = 15;
const MAX_MEAL_TIMES = 4;

/** Reminders (Pro): weigh-in, water, logging food and the end of a fast — local notifications on the phone. */
export default function RemindersScreen() {
  const t = useTheme();
  const db = useSQLiteContext();
  const { tr } = useI18n();
  const { isPro } = usePro();
  const [s, setS] = useState<ReminderSettings>(DEFAULT_REMINDERS);
  const [permission, setPermission] = useState<'granted' | 'ask' | 'denied' | null>(null);

  useEffect(() => {
    loadReminders().then(setS);
    permissionState()
      .then(setPermission)
      .catch(() => setPermission(null));
  }, []);

  const back = (
    <IconButton onPress={() => router.back()} accessibilityLabel={tr('Назад', 'Back')}>
      <ChevronLeftIcon size={24} color={t.c.text} />
    </IconButton>
  );

  if (!isPro) {
    return (
      <Screen title={tr('Напомняния', 'Reminders')} scroll left={back}>
        <ProLock emoji="🔔" title={tr('Напомняния', 'Reminders')} text={remindersTeaser()} />
      </Screen>
    );
  }

  /** Saves and reschedules; switching something on first asks for the notification permission. */
  const apply = async (next: ReminderSettings, turningOn = false) => {
    if (turningOn) {
      const ok = await ensurePermission().catch(() => false);
      setPermission(ok ? 'granted' : await permissionState().catch(() => 'denied' as const));
      if (!ok) {
        Alert.alert(
          tr('Известията са спрени', 'Notifications are off'),
          tr('Разреши известията за Azqm в настройките на телефона, за да получаваш напомняния.', 'Allow notifications for Azqm in your phone’s settings to get reminders.'),
          [
            { text: tr('Отказ', 'Cancel'), style: 'cancel' },
            { text: tr('Настройки', 'Settings'), onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
    }
    setS(next);
    await saveReminders(next);
    await scheduleDaily(next, isPro).catch(() => {});
    await syncFastReminder(db, next, isPro).catch(() => {});
  };

  const toggle = (key: keyof ReminderSettings) => (on: boolean) => apply({ ...s, [key]: { ...s[key], on } }, on);
  // Before any reminder is on, Android simply asks when one is switched on; warn only when it can't ask any more,
  // or when reminders are on but notifications were turned off in the phone's settings later.
  const anyOn = s.weighIn.on || s.water.on || s.meals.on || s.fastEnd.on;
  const blocked = permission === 'denied' || (permission === 'ask' && anyOn);

  return (
    <Screen title={tr('Напомняния', 'Reminders')} subtitle={tr('Известия на самия телефон — без интернет и без акаунт', 'Notifications from the phone itself — no internet, no account')} scroll left={back}>
      {blocked && (
        <Card style={{ backgroundColor: t.c.warningSoft, gap: 8 }}>
          <Txt v="bodyStrong" tone="warning">
            {tr('Известията за Azqm са изключени', 'Notifications for Azqm are off')}
          </Txt>
          <Txt v="small">{tr('Без тях напомнянията не могат да се покажат.', 'Reminders can’t show without them.')}</Txt>
          <Button label={tr('Отвори настройките', 'Open settings')} variant="secondary" small onPress={() => Linking.openSettings()} style={{ alignSelf: 'flex-start' }} />
        </Card>
      )}

      <ReminderCard emoji="⚖️" title={tr('Претегляне', 'Weigh-in')} text={tr('Всеки ден сутрин, преди закуска.', 'Every morning, before breakfast.')} on={s.weighIn.on} onToggle={toggle('weighIn')}>
        <TimeRow label={tr('Час', 'Time')} value={s.weighIn.time} onChange={(time) => apply({ ...s, weighIn: { ...s.weighIn, time } })} />
      </ReminderCard>

      <ReminderCard emoji="💧" title={tr('Вода', 'Water')} text={tr('Чаша вода на няколко часа през деня.', 'A glass of water every few hours during the day.')} on={s.water.on} onToggle={toggle('water')}>
        <TimeRow label={tr('От', 'From')} value={s.water.from} onChange={(from) => apply({ ...s, water: { ...s.water, from } })} />
        <TimeRow label={tr('До', 'To')} value={s.water.to} onChange={(to) => apply({ ...s, water: { ...s.water, to } })} />
        <Row gap={8}>
          <Txt style={{ flex: 1 }}>{tr('На всеки', 'Every')}</Txt>
          {[1, 2, 3].map((h) => (
            <Chip key={h} label={tr('{h} ч', '{h} h', { h })} active={s.water.everyHours === h} onPress={() => apply({ ...s, water: { ...s.water, everyHours: h } })} />
          ))}
        </Row>
        <Txt v="caption" tone="textMuted">
          {waterTimes(s.water).join(' · ')}
        </Txt>
      </ReminderCard>

      <ReminderCard emoji="🍽️" title={tr('Записване на храната', 'Logging food')} text={tr('Напомняне да запишеш храната.', 'A nudge to log what you’ve eaten.')} on={s.meals.on} onToggle={toggle('meals')}>
        {s.meals.times.map((time, i) => (
          <TimeRow
            key={i}
            label={tr('Час {n}', 'Time {n}', { n: i + 1 })}
            value={time}
            onChange={(v) => apply({ ...s, meals: { ...s.meals, times: s.meals.times.map((x, j) => (j === i ? v : x)) } })}
            onRemove={s.meals.times.length > 1 ? () => apply({ ...s, meals: { ...s.meals, times: s.meals.times.filter((_, j) => j !== i) } }) : undefined}
          />
        ))}
        {s.meals.times.length < MAX_MEAL_TIMES && (
          <Pressable onPress={() => apply({ ...s, meals: { ...s.meals, times: [...s.meals.times, '18:00'] } })} hitSlop={8}>
            <Txt v="smallStrong" tone="accent">
              + {tr('Още един час', 'Another time')}
            </Txt>
          </Pressable>
        )}
      </ReminderCard>

      <ReminderCard
        emoji="⏱️"
        title={tr('Край на поста', 'End of a fast')}
        text={tr('Известие, когато пуснатият пост стигне целта си.', 'A notification when the running fast reaches its goal.')}
        on={s.fastEnd.on}
        onToggle={toggle('fastEnd')}
      />

      <Txt v="caption" tone="textFaint" center style={{ marginTop: 4 }}>
        {tr('Телефонът може да покаже напомнянето няколко минути по-късно, за да пести батерия.', 'Your phone may show a reminder a few minutes late to save battery.')}
      </Txt>
    </Screen>
  );
}

function ReminderCard({ emoji, title, text, on, onToggle, children }: { emoji: string; title: string; text: string; on: boolean; onToggle: (on: boolean) => void; children?: React.ReactNode }) {
  const t = useTheme();
  return (
    <Card style={{ gap: 12 }}>
      <Row gap={12}>
        <Txt style={{ fontSize: 24 }}>{emoji}</Txt>
        <View style={{ flex: 1 }}>
          <Txt v="bodyStrong">{title}</Txt>
          <Txt v="small" tone="textMuted">
            {text}
          </Txt>
        </View>
        <Switch value={on} onValueChange={onToggle} trackColor={{ true: t.c.accent, false: t.c.border }} thumbColor={on ? t.c.onAccent : t.c.surfaceAlt} />
      </Row>
      {on && children}
    </Card>
  );
}

/** "Час  − 07:30 +" in 15-minute steps. */
function TimeRow({ label, value, onChange, onRemove }: { label: string; value: string; onChange: (v: string) => void; onRemove?: () => void }) {
  const t = useTheme();
  const s = useStyles();
  const { tr } = useI18n();
  const [h, m] = value.split(':').map(Number);
  const shift = (d: number) => onChange(fromMinutes(h * 60 + m + d));
  return (
    <Row gap={10}>
      <Txt style={{ flex: 1 }}>{label}</Txt>
      {onRemove && (
        <Pressable onPress={onRemove} hitSlop={8}>
          <Txt v="small" tone="textMuted">
            {tr('Махни', 'Remove')}
          </Txt>
        </Pressable>
      )}
      <Pressable onPress={() => shift(-STEP_MIN)} style={s.stepBtn} hitSlop={6} accessibilityLabel={tr('По-рано', 'Earlier')}>
        <MinusIcon size={18} color={t.c.text} />
      </Pressable>
      <Txt v="h3" style={{ width: 64, textAlign: 'center', fontVariant: ['tabular-nums'] }}>
        {value}
      </Txt>
      <Pressable onPress={() => shift(STEP_MIN)} style={s.stepBtn} hitSlop={6} accessibilityLabel={tr('По-късно', 'Later')}>
        <PlusIcon size={18} color={t.c.text} />
      </Pressable>
    </Row>
  );
}

const useStyles = makeStyles((t) => ({
  stepBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: t.c.surfaceAlt },
}));
