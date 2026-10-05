import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Bar, Button, Card, EmptyState, IconButton, Row, Screen, Txt } from '@/components/ui';
import { ProgressRing } from '@/components/ProgressRing';
import { DateSwitcher } from '@/components/DateSwitcher';
import { FoodEntryRow } from '@/components/FoodEntryRow';
import { EntrySheet } from '@/components/EntrySheet';
import { ChevronRightIcon, CopyIcon, DropletIcon, FastingIcon, PlusIcon, SettingsIcon, WarningIcon } from '@/components/icons';
import { useSettings } from '@/context/SettingsContext';
import { useProfile } from '@/context/ProfileContext';
import { useDataRefresh } from '@/context/DataRefreshContext';
import { useSelectedDate } from '@/context/SelectedDateContext';
import { useToast } from '@/context/ToastContext';
import { formatDuration, useFasting } from '@/hooks/useFasting';
import { copyDay, getDaySummaries, getEntriesForDate, getHydrationTotals, insertHydrationEntry } from '@/db/queries';
import { getDiet } from '@/data/diets';
import { NUTRIENT_META, addNutrients, emptyNutrients, formatAmount, netCarbsOf, nutrientTarget } from '@/data/nutrients';
import { makeStyles, useTheme } from '@/theme/ThemeContext';
import type { FoodEntry, HydrationTotals, NutrientKey } from '@/types';
import { MEALS, entryTimeIso, formatLongDate, formatNumber, shiftDateKey, todayKey } from '@/utils/date';
import { waterGoalMl } from '@/utils/bodyMetrics';

const EMPTY_WATER: HydrationTotals = { waterMl: 0, sodiumMg: 0, potassiumMg: 0, magnesiumMg: 0 };
const ALERT_KEYS: NutrientKey[] = ['sodium', 'sugar', 'satFat', 'vitA', 'iron', 'zinc', 'selenium', 'calcium'];

export default function TodayScreen() {
  const t = useTheme();
  const s = useStyles();
  const db = useSQLiteContext();
  const settings = useSettings();
  const { goals } = settings;
  const { profile } = useProfile();
  const { version, bump } = useDataRefresh();
  const { date } = useSelectedDate();
  const toast = useToast();
  const fasting = useFasting(30000);
  const diet = getDiet(settings.dietId);

  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [water, setWater] = useState<HydrationTotals>(EMPTY_WATER);
  const [avg7, setAvg7] = useState<{ kcal: number; days: number }>({ kcal: 0, days: 0 });
  const [yesterdayCount, setYesterdayCount] = useState(0);
  const [editing, setEditing] = useState<FoodEntry | null>(null);

  const load = useCallback(async () => {
    const yesterday = shiftDateKey(date, -1);
    const today = todayKey();
    const [e, h, week, y] = await Promise.all([
      getEntriesForDate(db, date),
      getHydrationTotals(db, date),
      getDaySummaries(db, shiftDateKey(today, -7), shiftDateKey(today, -1)),
      getEntriesForDate(db, yesterday),
    ]);
    setEntries(e);
    setWater(h);
    setAvg7({ kcal: week.length ? week.reduce((sum, d) => sum + d.n.kcal, 0) / week.length : 0, days: week.length });
    setYesterdayCount(y.length);
  }, [db, date]);

  useEffect(() => {
    // Refetch whenever the day or the data changes; state is set after the awaited queries.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load, version]);

  const totals = useMemo(() => entries.reduce((acc, e) => addNutrients(acc, e.n), emptyNutrients()), [entries]);
  const carbs = diet.carbBasis === 'net' ? netCarbsOf(totals) : totals.carbs;
  const remaining = goals.calories - totals.kcal;
  const waterGoal = waterGoalMl(profile);

  // Only "too much" alerts make sense during the day — "too little" is judged on the Анализ tab over whole days.
  const alerts = useMemo(() => {
    if (entries.length === 0) return [];
    const withSupplements = addNutrients(totals, { sodium: water.sodiumMg, potassium: water.potassiumMg, magnesium: water.magnesiumMg });
    return ALERT_KEYS.flatMap((k) => {
      const target = nutrientTarget(k, profile, diet, goals.calories);
      if (!target?.max) return [];
      const v = withSupplements[target.maxKey ?? k];
      return v > target.max ? [{ k, v: withSupplements[k], max: target.max }] : [];
    });
  }, [entries, totals, water, profile, diet, goals.calories]);

  const byMeal = useMemo(
    () => MEALS.map((m) => ({ ...m, items: entries.filter((e) => e.meal === m.key) })).filter((m) => m.items.length > 0),
    [entries]
  );

  const addWater = async (ml: number) => {
    await insertHydrationEntry(db, { date, timeIso: entryTimeIso(date), waterMl: ml, sodiumMg: 0, potassiumMg: 0, magnesiumMg: 0 });
    bump();
  };

  const copyYesterday = async () => {
    const n = await copyDay(db, shiftDateKey(date, -1), date);
    bump();
    toast.show(`Копирани ${n} записа от предишния ден`);
  };

  const split = totals.kcal > 0 ? { p: (totals.protein * 4) / totals.kcal, f: (totals.fat * 9) / totals.kcal, c: (carbs * 4) / totals.kcal } : null;

  return (
    <Screen
      scroll
      left={
        <Txt v="h2" tone="accent" style={{ fontWeight: '800' }}>
          Azqm
        </Txt>
      }
      right={
        <Row gap={10}>
          <DateSwitcher compact />
          <IconButton onPress={() => router.push('/settings')} accessibilityLabel="Настройки">
            <SettingsIcon size={22} color={t.c.text} />
          </IconButton>
        </Row>
      }
    >
      <Txt v="small" tone="textMuted" style={{ marginBottom: 10 }}>
        {formatLongDate(date)}
      </Txt>

      <Pressable onPress={() => router.push('/diet')} style={({ pressed }) => [s.dietChip, pressed && { opacity: 0.8 }]}>
        <View style={{ flex: 1 }}>
          <Txt v="caption" tone="textMuted">
            Хранителен режим
          </Txt>
          <Txt v="bodyStrong">{diet.name}</Txt>
        </View>
        <Txt v="caption" tone="textMuted">
          Смени
        </Txt>
        <ChevronRightIcon size={18} color={t.c.textMuted} />
      </Pressable>

      {diet.noCalories ? (
        <Card>
          <Txt v="h3" style={{ marginBottom: 6 }}>
            Лечебно гладуване
          </Txt>
          <Txt tone="textMuted">
            {fasting.isFasting ? `В пост от ${formatDuration(fasting.elapsedMs, false)} (цел ${fasting.goalHours} ч).` : 'Таймерът не е пуснат — започни поста от раздел „Пост“.'}
          </Txt>
          <Txt v="small" tone="warning" style={{ marginTop: 10 }}>
            Пий вода и електролити. При слабост, сърцебиене или замайване прекъсни гладуването.
          </Txt>
          <Button label="Към таймера" variant="secondary" small onPress={() => router.navigate('/fasting')} style={{ marginTop: 12, alignSelf: 'flex-start' }} />
        </Card>
      ) : (
        <Card>
          <Row gap={16} style={{ alignItems: 'center' }}>
            <ProgressRing size={136} strokeWidth={13} progress={goals.calories > 0 ? totals.kcal / goals.calories : 0} color={remaining < 0 ? t.c.warning : t.c.accent}>
              <Txt v="h1" style={{ fontVariant: ['tabular-nums'] }}>
                {formatNumber(totals.kcal)}
              </Txt>
              <Txt v="caption" tone="textMuted">
                от {formatNumber(goals.calories)} ккал
              </Txt>
            </ProgressRing>
            <View style={{ flex: 1, gap: 12 }}>
              <View>
                <Txt v="caption" tone="textMuted">
                  {remaining >= 0 ? 'Остават' : 'Над целта'}
                </Txt>
                <Txt v="h2" tone={remaining >= 0 ? 'text' : 'warning'}>
                  {formatNumber(Math.abs(remaining))} ккал
                </Txt>
              </View>
              <MacroBar label="Протеин" value={totals.protein} goal={goals.protein} color={t.c.protein} />
              <MacroBar label="Мазнини" value={totals.fat} goal={goals.fat} color={t.c.fat} />
              <MacroBar label={diet.carbBasis === 'net' ? 'Нетни въгл.' : 'Въглехидрати'} value={carbs} goal={goals.carbs} color={t.c.carbs} strictMax={diet.carbCapG != null} />
            </View>
          </Row>
          {split && (
            <Txt v="caption" tone="textMuted" style={{ marginTop: 14 }}>
              Разпределение днес: Б {Math.round(split.p * 100)}% · М {Math.round(split.f * 100)}% · В {Math.round(split.c * 100)}% (цел {Math.round(diet.split.protein * 100)}/
              {Math.round(diet.split.fat * 100)}/{Math.round(diet.split.carbs * 100)}) · Фибри {formatNumber(totals.fiber)} г
            </Txt>
          )}
        </Card>
      )}

      <Row gap={10} style={{ marginBottom: 14, alignItems: 'stretch' }}>
        <Card style={s.tile} tight>
          <Row gap={6}>
            <DropletIcon size={18} color={t.c.water} />
            <Txt v="caption" tone="textMuted">
              Вода
            </Txt>
          </Row>
          <Txt v="h3" style={{ marginTop: 6 }}>
            {formatNumber(water.waterMl / 1000, 2)} / {formatNumber(waterGoal / 1000, 1)} л
          </Txt>
          <Bar value={water.waterMl} max={waterGoal} color={t.c.water} height={6} style={{ marginVertical: 8 }} />
          <Pressable onPress={() => addWater(250)} style={s.tileBtn} hitSlop={6}>
            <PlusIcon size={16} color={t.c.water} />
            <Txt v="smallStrong" color={t.c.water}>
              250 мл
            </Txt>
          </Pressable>
        </Card>
        <Card style={s.tile} tight onPress={() => router.navigate('/fasting')}>
          <Row gap={6}>
            <FastingIcon size={18} color={t.c.accent} />
            <Txt v="caption" tone="textMuted">
              Пост
            </Txt>
          </Row>
          <Txt v="h3" style={{ marginTop: 6 }}>
            {fasting.isFasting ? formatDuration(fasting.elapsedMs, false) : 'не е пуснат'}
          </Txt>
          <Txt v="caption" tone="textMuted" style={{ marginTop: 6 }}>
            {fasting.isFasting ? `цел ${fasting.goalHours} ч` : `цел ${settings.fastingGoalHours} ч · старт`}
          </Txt>
        </Card>
        <Card style={s.tile} tight onPress={() => router.navigate('/analysis')}>
          <Txt v="caption" tone="textMuted">
            Средно 7 дни
          </Txt>
          <Txt v="h3" style={{ marginTop: 6 }}>
            {avg7.days ? formatNumber(avg7.kcal) : '—'}
          </Txt>
          <Txt v="caption" tone="textMuted" style={{ marginTop: 6 }}>
            {avg7.days ? `ккал/ден · ${avg7.days} дни` : 'още няма дни'}
          </Txt>
        </Card>
      </Row>

      {alerts.length > 0 && (
        <Card style={{ backgroundColor: t.c.warningSoft }} onPress={() => router.navigate('/analysis')}>
          <Row gap={8} style={{ marginBottom: 6 }}>
            <WarningIcon size={20} color={t.c.warning} />
            <Txt v="bodyStrong" tone="warning">
              Днес е твърде много
            </Txt>
          </Row>
          {alerts.map((a) => (
            <Txt key={a.k} v="small">
              {NUTRIENT_META[a.k].label}: {formatAmount(a.v, a.k)} {NUTRIENT_META[a.k].unit} (граница {formatAmount(a.max, a.k)})
            </Txt>
          ))}
        </Card>
      )}

      <Button label="Добави храна" icon={<PlusIcon size={22} color={t.c.onAccent} />} onPress={() => router.navigate('/add')} style={{ marginBottom: 14 }} />

      {entries.length === 0 ? (
        <Card>
          <EmptyState emoji="🍽️" title="Още няма записи за този ден" text="Добави храна от базата, с баркод или ръчно.">
            {yesterdayCount > 0 && (
              <Button label="Копирай храните от предишния ден" variant="secondary" small icon={<CopyIcon size={18} color={t.c.text} />} onPress={copyYesterday} style={{ marginTop: 12 }} />
            )}
          </EmptyState>
        </Card>
      ) : (
        byMeal.map((m) => (
          <Card key={m.key}>
            <Row style={{ marginBottom: 4 }}>
              <Txt v="h3" style={{ flex: 1 }}>
                {m.emoji} {m.label}
              </Txt>
              <Txt v="smallStrong" tone="textMuted">
                {formatNumber(m.items.reduce((sum, e) => sum + e.n.kcal, 0))} ккал
              </Txt>
            </Row>
            {m.items.map((e) => (
              <FoodEntryRow key={e.id} entry={e} carbBasis={diet.carbBasis} onPress={setEditing} />
            ))}
          </Card>
        ))
      )}

      {entries.length > 0 && (
        <Txt v="caption" tone="textFaint" center style={{ marginTop: 4 }}>
          Докосни запис, за да промениш грамажа, да го повториш или изтриеш.
        </Txt>
      )}

      <EntrySheet entry={editing} onClose={() => setEditing(null)} />
    </Screen>
  );
}

function MacroBar({ label, value, goal, color, strictMax }: { label: string; value: number; goal: number; color: string; strictMax?: boolean }) {
  const t = useTheme();
  const over = goal > 0 && value > goal * 1.05;
  return (
    <View>
      <Row style={{ justifyContent: 'space-between', marginBottom: 4 }}>
        <Txt v="caption" tone="textMuted">
          {label}
        </Txt>
        <Txt v="caption" style={{ fontWeight: '700' }} color={over && strictMax ? t.c.warning : undefined}>
          {formatNumber(value)} / {formatNumber(goal)} г
        </Txt>
      </Row>
      <Bar value={value} max={goal} color={over && strictMax ? t.c.warning : color} height={8} />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  dietChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: t.c.accentSoft,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 14,
  },
  tile: { flex: 1, marginBottom: 0, justifyContent: 'space-between' },
  tileBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
}));
