import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Bar, Button, Card, Chip, Row, Screen, SectionHeader, Txt } from '@/components/ui';
import { ProgressRing } from '@/components/ProgressRing';
import { CheckIcon, DropletIcon, TrashIcon, WarningIcon } from '@/components/icons';
import { useSettings } from '@/context/SettingsContext';
import { useProfile } from '@/context/ProfileContext';
import { useDataRefresh } from '@/context/DataRefreshContext';
import { FAST_STAGES, formatDuration, useFasting } from '@/hooks/useFasting';
import { deleteFast, getFasts, getHydrationTotals, insertHydrationEntry } from '@/db/queries';
import { getDiet } from '@/data/diets';
import { useTheme } from '@/theme/ThemeContext';
import type { FastRecord, HydrationTotals } from '@/types';
import { formatNumber, todayKey } from '@/utils/date';
import { waterGoalMl } from '@/utils/bodyMetrics';
import { locale, tr, useI18n } from '@/i18n';

const EMPTY: HydrationTotals = { waterMl: 0, sodiumMg: 0, potassiumMg: 0, magnesiumMg: 0 };

const GOALS: { hours: number; readonly label: string }[] = [
  { hours: 12, label: '12:12' },
  { hours: 14, label: '14:10' },
  { hours: 16, label: '16:8' },
  { hours: 18, label: '18:6' },
  { hours: 20, label: '20:4' },
  { hours: 23, label: '23:1 OMAD' },
  ...[24, 36, 48, 72].map((hours) => ({
    hours,
    get label() {
      return tr(`${hours} ч`, `${hours} h`);
    },
  })),
];

/** Targets while fasting / on keto (sodium, potassium, magnesium per day). */
const ELECTROLYTES = { sodiumMg: 4000, potassiumMg: 3500, magnesiumMg: 400 };

const QUICK: { key: string; readonly label: string; patch: Partial<HydrationTotals> }[] = (
  [
    ['water250', '+250 мл вода', '+250 ml water', { waterMl: 250 }],
    ['water500', '+500 мл вода', '+500 ml water', { waterMl: 500 }],
    ['salt', '+½ ч.л. сол (1150 мг натрий)', '+½ tsp salt (1150 mg sodium)', { sodiumMg: 1150 }],
    ['potassium', '+300 мг калий', '+300 mg potassium', { potassiumMg: 300 }],
    ['magnesium', '+200 мг магнезий', '+200 mg magnesium', { magnesiumMg: 200 }],
  ] as const
).map(([key, bg, en, patch]) => ({
  key,
  patch,
  get label() {
    return tr(bg, en);
  },
}));

export default function FastingScreen() {
  const t = useTheme();
  const db = useSQLiteContext();
  const { fastingGoalHours, update, dietId } = useSettings();
  const { profile } = useProfile();
  const { version, bump } = useDataRefresh();
  const timer = useFasting(1000);
  useI18n();
  const diet = getDiet(dietId);
  const [water, setWater] = useState<HydrationTotals>(EMPTY);
  const [history, setHistory] = useState<FastRecord[]>([]);

  const load = useCallback(async () => {
    const [w, h] = await Promise.all([getHydrationTotals(db, todayKey()), getFasts(db, 12)]);
    setWater(w);
    setHistory(h);
  }, [db]);

  useEffect(() => {
    // Refetch when data changes; state is set after the awaited queries.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load, version]);

  const selectGoal = async (hours: number) => {
    await update({ fastingGoalHours: hours });
    if (timer.isFasting) await timer.changeGoal(hours);
  };

  const toggle = () => {
    if (timer.isFasting) {
      Alert.alert(
        tr('Да прекратя ли поста?', 'End the fast?'),
        tr(`Продължителност: ${formatDuration(timer.elapsedMs, false)}. Ще се запише в историята.`, `Duration: ${formatDuration(timer.elapsedMs, false)}. It will be saved to your history.`),
        [
          { text: tr('Отказ', 'Cancel'), style: 'cancel' },
          { text: tr('Прекрати', 'End'), style: 'destructive', onPress: () => timer.stop() },
        ]
      );
    } else {
      timer.start(0);
    }
  };

  const quickAdd = async (patch: Partial<HydrationTotals>) => {
    await insertHydrationEntry(db, { date: todayKey(), timeIso: new Date().toISOString(), waterMl: 0, sodiumMg: 0, potassiumMg: 0, magnesiumMg: 0, ...patch });
    bump();
  };

  const removeFast = (f: FastRecord) =>
    Alert.alert(tr('Изтриване', 'Delete'), tr('Да изтрия ли този пост от историята?', 'Delete this fast from your history?'), [
      { text: tr('Отказ', 'Cancel'), style: 'cancel' },
      {
        text: tr('Изтрий', 'Delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteFast(db, f.id);
          bump();
        },
      },
    ]);

  const elapsedH = timer.elapsedMs / 3600000;
  const stageIndex = FAST_STAGES.reduce((acc, st, i) => (elapsedH >= st.hours ? i : acc), 0);
  const long = timer.goalHours >= 36 || diet.noCalories;
  const showElectrolytes = diet.electrolytes === 'high' || timer.goalHours >= 24;
  const waterGoal = waterGoalMl(profile);

  return (
    <Screen
      title={tr('Пост', 'Fasting')}
      subtitle={tr(`Интервално хранене и гладуване · цел ${timer.goalHours} ч`, `Intermittent and extended fasting · goal ${timer.goalHours} h`)}
      scroll
    >
      <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
        <ProgressRing size={230} strokeWidth={16} progress={timer.progress} color={timer.isGoalReached ? t.c.success : t.c.accent}>
          <Txt v="h1" style={{ fontVariant: ['tabular-nums'] }}>
            {formatDuration(timer.elapsedMs)}
          </Txt>
          <Txt v="small" tone="textMuted" style={{ marginTop: 2 }}>
            {timer.isFasting
              ? timer.isGoalReached
                ? tr('Целта е постигната! 🎉', 'Goal reached! 🎉')
                : tr(`остават ${formatDuration(timer.remainingMs, false)}`, `${formatDuration(timer.remainingMs, false)} to go`)
              : tr('няма активен пост', 'no active fast')}
          </Txt>
        </ProgressRing>
        <Button
          label={timer.isFasting ? tr('Прекрати поста', 'End fast') : tr('Започни пост сега', 'Start fasting now')}
          variant={timer.isFasting ? 'danger' : 'primary'}
          onPress={toggle}
          style={{ marginTop: 20, alignSelf: 'stretch' }}
        />
        {!timer.isFasting && (
          <View style={{ alignSelf: 'stretch', marginTop: 12 }}>
            <Txt v="caption" tone="textMuted" center style={{ marginBottom: 8 }}>
              {tr('Последното хранене беше преди:', 'My last meal was this long ago:')}
            </Txt>
            <Row gap={8} style={{ justifyContent: 'center' }}>
              {[1, 2, 3, 4].map((h) => (
                <Chip key={h} label={tr(`${h} ч`, `${h} h`)} onPress={() => timer.start(h)} />
              ))}
            </Row>
          </View>
        )}
      </Card>

      <SectionHeader title={tr('Продължителност', 'Duration')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 14 }}>
        {GOALS.map((g) => (
          <Chip key={g.hours} label={g.label} active={(timer.isFasting ? timer.goalHours : fastingGoalHours) === g.hours} onPress={() => selectGoal(g.hours)} />
        ))}
      </ScrollView>

      {long && (
        <Card style={{ backgroundColor: t.c.warningSoft }}>
          <Row gap={8} style={{ marginBottom: 6 }}>
            <WarningIcon size={20} color={t.c.warning} />
            <Txt v="bodyStrong" tone="warning">
              {tr('Продължително гладуване', 'Extended fasting')}
            </Txt>
          </Row>
          <Txt v="small">{getDiet('fasting').warning}</Txt>
          <Txt v="small" style={{ marginTop: 6 }}>
            {tr(
              'Пий 2–3 л вода, приемай сол, калий и магнезий. Прекъсни веднага при силна слабост, сърцебиене, объркване или прилошаване. След гладуването започни с бульон и малки порции.',
              'Drink 2–3 L of water and take salt, potassium and magnesium. Stop right away if you feel very weak, confused, faint or your heart is racing. After the fast, start with broth and small portions.'
            )}
          </Txt>
        </Card>
      )}

      {timer.isFasting && (
        <>
          <SectionHeader title={tr('Какво се случва в тялото', 'What’s happening in your body')} />
          <Card>
            {FAST_STAGES.filter((st) => st.hours <= Math.max(timer.goalHours, 16)).map((st, i) => {
              const reached = elapsedH >= st.hours;
              const current = i === stageIndex;
              return (
                <Row key={st.hours} gap={12} style={{ alignItems: 'flex-start', paddingVertical: 8, opacity: reached ? 1 : 0.5 }}>
                  <View style={{ width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: reached ? t.c.accent : t.c.track }}>
                    {reached ? <CheckIcon size={15} color={t.c.onAccent} /> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt v="smallStrong" tone={current ? 'accent' : 'text'}>
                      {st.hours} {tr('ч', 'h')} · {st.title}
                    </Txt>
                    <Txt v="caption" tone="textMuted">
                      {st.text}
                    </Txt>
                  </View>
                </Row>
              );
            })}
            <Txt v="caption" tone="textFaint" style={{ marginTop: 6 }}>
              {tr('Етапите са ориентировъчни и зависят от последното хранене и активността.', 'The stages are approximate and depend on your last meal and activity.')}
            </Txt>
          </Card>
        </>
      )}

      <SectionHeader title={tr('Вода и електролити днес', 'Water and electrolytes today')} />
      <Card>
        <Meter label={tr('Вода', 'Water')} value={water.waterMl} target={waterGoal} unit={tr('мл', 'ml')} color={t.c.water} />
        {showElectrolytes && (
          <>
            <Meter label={tr('Натрий (добавен)', 'Sodium (added)')} value={water.sodiumMg} target={ELECTROLYTES.sodiumMg} unit={tr('мг', 'mg')} color={t.c.protein} />
            <Meter label={tr('Калий (добавен)', 'Potassium (added)')} value={water.potassiumMg} target={ELECTROLYTES.potassiumMg} unit={tr('мг', 'mg')} color={t.c.accent} />
            <Meter label={tr('Магнезий (добавен)', 'Magnesium (added)')} value={water.magnesiumMg} target={ELECTROLYTES.magnesiumMg} unit={tr('мг', 'mg')} color={t.c.fat} />
            <Txt v="caption" tone="textFaint" style={{ marginBottom: 10 }}>
              {tr(
                'Целите са за кето/гладуване и включват храната; тук се броят само добавените електролити. Храната се добавя автоматично в „Анализ“.',
                'The targets are for keto/fasting and include food; only added electrolytes are counted here. Food is added automatically on the “Analysis” tab.'
              )}
            </Txt>
          </>
        )}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
          {QUICK.filter((q) => showElectrolytes || 'waterMl' in q.patch).map((q) => (
            <Pressable key={q.key} onPress={() => quickAdd(q.patch)} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: t.c.surfaceAlt, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 }, pressed && { opacity: 0.7 }]}>
              <DropletIcon size={16} color={t.c.water} />
              <Txt v="smallStrong">{q.label}</Txt>
            </Pressable>
          ))}
        </View>
      </Card>

      {history.length > 0 && (
        <>
          <SectionHeader title={tr('История', 'History')} />
          <Card>
            {history.map((f, i) => {
              const hours = f.endIso ? (new Date(f.endIso).getTime() - new Date(f.startIso).getTime()) / 3600000 : 0;
              const ok = hours >= f.goalHours;
              return (
                <Row key={f.id} style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: t.c.border }}>
                  <View style={{ flex: 1 }}>
                    <Txt v="smallStrong">{new Date(f.startIso).toLocaleDateString(locale(), { day: 'numeric', month: 'long' })}</Txt>
                    <Txt v="caption" tone="textMuted">
                      {tr(`цел ${f.goalHours} ч`, `goal ${f.goalHours} h`)}
                    </Txt>
                  </View>
                  <Txt v="bodyStrong" tone={ok ? 'success' : 'text'} style={{ marginRight: 12 }}>
                    {formatNumber(hours, 1)} {tr('ч', 'h')} {ok ? '✓' : ''}
                  </Txt>
                  <Pressable onPress={() => removeFast(f)} hitSlop={10}>
                    <TrashIcon size={20} color={t.c.textFaint} />
                  </Pressable>
                </Row>
              );
            })}
          </Card>
        </>
      )}
    </Screen>
  );
}

function Meter({ label, value, target, unit, color }: { label: string; value: number; target: number; unit: string; color: string }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Row style={{ justifyContent: 'space-between', marginBottom: 6 }}>
        <Txt v="smallStrong">{label}</Txt>
        <Txt v="caption" tone="textMuted">
          {formatNumber(value)} / {formatNumber(target)} {unit}
        </Txt>
      </Row>
      <Bar value={value} max={target} color={color} height={10} />
    </View>
  );
}
