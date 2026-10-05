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
import { useI18n } from '@/i18n';

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
  const { lang, tr } = useI18n();
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
    // lang: the spread snapshots the meal label getter, so recompute on a language switch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries, lang]
  );

  const addWater = async (ml: number) => {
    await insertHydrationEntry(db, { date, timeIso: entryTimeIso(date), waterMl: ml, sodiumMg: 0, potassiumMg: 0, magnesiumMg: 0 });
    bump();
  };

  const copyYesterday = async () => {
    const n = await copyDay(db, shiftDateKey(date, -1), date);
    bump();
    toast.show(tr(`Копирани ${n} записа от предишния ден`, `Copied ${n} ${n === 1 ? 'entry' : 'entries'} from the previous day`));
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
          <IconButton onPress={() => router.push('/settings')} accessibilityLabel={tr('Настройки', 'Settings')}>
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
            {tr('Хранителен режим', 'Diet')}
          </Txt>
          <Txt v="bodyStrong">{diet.name}</Txt>
        </View>
        <Txt v="caption" tone="textMuted">
          {tr('Смени', 'Change')}
        </Txt>
        <ChevronRightIcon size={18} color={t.c.textMuted} />
      </Pressable>

      {diet.noCalories ? (
        <Card>
          <Txt v="h3" style={{ marginBottom: 6 }}>
            {tr('Лечебно гладуване', 'Therapeutic fasting')}
          </Txt>
          <Txt tone="textMuted">
            {fasting.isFasting
              ? tr(`В пост от ${formatDuration(fasting.elapsedMs, false)} (цел ${fasting.goalHours} ч).`, `Fasting for ${formatDuration(fasting.elapsedMs, false)} (goal ${fasting.goalHours} h).`)
              : tr('Таймерът не е пуснат — започни поста от раздел „Пост“.', 'The timer isn’t running — start your fast from the “Fasting” tab.')}
          </Txt>
          <Txt v="small" tone="warning" style={{ marginTop: 10 }}>
            {tr(
              'Пий вода и електролити. При слабост, сърцебиене или замайване прекъсни гладуването.',
              'Drink water and take electrolytes. Stop fasting if you feel weak, dizzy or your heart is racing.'
            )}
          </Txt>
          <Button label={tr('Към таймера', 'Go to timer')} variant="secondary" small onPress={() => router.navigate('/fasting')} style={{ marginTop: 12, alignSelf: 'flex-start' }} />
        </Card>
      ) : (
        <Card>
          <Row gap={16} style={{ alignItems: 'center' }}>
            <ProgressRing size={136} strokeWidth={13} progress={goals.calories > 0 ? totals.kcal / goals.calories : 0} color={remaining < 0 ? t.c.warning : t.c.accent}>
              <Txt v="h1" style={{ fontVariant: ['tabular-nums'] }}>
                {formatNumber(totals.kcal)}
              </Txt>
              <Txt v="caption" tone="textMuted">
                {tr('от', 'of')} {formatNumber(goals.calories)} {tr('ккал', 'kcal')}
              </Txt>
            </ProgressRing>
            <View style={{ flex: 1, gap: 12 }}>
              <View>
                <Txt v="caption" tone="textMuted">
                  {remaining >= 0 ? tr('Остават', 'Remaining') : tr('Над целта', 'Over goal')}
                </Txt>
                <Txt v="h2" tone={remaining >= 0 ? 'text' : 'warning'}>
                  {formatNumber(Math.abs(remaining))} {tr('ккал', 'kcal')}
                </Txt>
              </View>
              <MacroBar label={tr('Протеин', 'Protein')} value={totals.protein} goal={goals.protein} color={t.c.protein} />
              <MacroBar label={tr('Мазнини', 'Fat')} value={totals.fat} goal={goals.fat} color={t.c.fat} />
              <MacroBar label={diet.carbBasis === 'net' ? tr('Нетни въгл.', 'Net carbs') : tr('Въглехидрати', 'Carbs')} value={carbs} goal={goals.carbs} color={t.c.carbs} strictMax={diet.carbCapG != null} />
            </View>
          </Row>
          {split && (
            <Txt v="caption" tone="textMuted" style={{ marginTop: 14 }}>
              {tr('Разпределение днес: Б', 'Today’s split: P')} {Math.round(split.p * 100)}% · {tr('М', 'F')} {Math.round(split.f * 100)}% · {tr('В', 'C')} {Math.round(split.c * 100)}% (
              {tr('цел', 'goal')} {Math.round(diet.split.protein * 100)}/{Math.round(diet.split.fat * 100)}/{Math.round(diet.split.carbs * 100)}) · {tr('Фибри', 'Fiber')}{' '}
              {formatNumber(totals.fiber)} {tr('г', 'g')}
            </Txt>
          )}
        </Card>
      )}

      <Row gap={10} style={{ marginBottom: 14, alignItems: 'stretch' }}>
        <Card style={s.tile} tight>
          <Row gap={6}>
            <DropletIcon size={18} color={t.c.water} />
            <Txt v="caption" tone="textMuted">
              {tr('Вода', 'Water')}
            </Txt>
          </Row>
          <Txt v="h3" style={{ marginTop: 6 }}>
            {formatNumber(water.waterMl / 1000, 2)} / {formatNumber(waterGoal / 1000, 1)} {tr('л', 'L')}
          </Txt>
          <Bar value={water.waterMl} max={waterGoal} color={t.c.water} height={6} style={{ marginVertical: 8 }} />
          <Pressable onPress={() => addWater(250)} style={s.tileBtn} hitSlop={6}>
            <PlusIcon size={16} color={t.c.water} />
            <Txt v="smallStrong" color={t.c.water}>
              250 {tr('мл', 'ml')}
            </Txt>
          </Pressable>
        </Card>
        <Card style={s.tile} tight onPress={() => router.navigate('/fasting')}>
          <Row gap={6}>
            <FastingIcon size={18} color={t.c.accent} />
            <Txt v="caption" tone="textMuted">
              {tr('Пост', 'Fasting')}
            </Txt>
          </Row>
          <Txt v="h3" style={{ marginTop: 6 }}>
            {fasting.isFasting ? formatDuration(fasting.elapsedMs, false) : tr('не е пуснат', 'not started')}
          </Txt>
          <Txt v="caption" tone="textMuted" style={{ marginTop: 6 }}>
            {fasting.isFasting ? tr(`цел ${fasting.goalHours} ч`, `goal ${fasting.goalHours} h`) : tr(`цел ${settings.fastingGoalHours} ч · старт`, `goal ${settings.fastingGoalHours} h · start`)}
          </Txt>
        </Card>
        <Card style={s.tile} tight onPress={() => router.navigate('/analysis')}>
          <Txt v="caption" tone="textMuted">
            {tr('Средно 7 дни', '7-day average')}
          </Txt>
          <Txt v="h3" style={{ marginTop: 6 }}>
            {avg7.days ? formatNumber(avg7.kcal) : '—'}
          </Txt>
          <Txt v="caption" tone="textMuted" style={{ marginTop: 6 }}>
            {avg7.days
              ? tr(`ккал/ден · ${avg7.days} дни`, `kcal/day · ${avg7.days} ${avg7.days === 1 ? 'day' : 'days'}`)
              : tr('още няма дни', 'no days yet')}
          </Txt>
        </Card>
      </Row>

      {alerts.length > 0 && (
        <Card style={{ backgroundColor: t.c.warningSoft }} onPress={() => router.navigate('/analysis')}>
          <Row gap={8} style={{ marginBottom: 6 }}>
            <WarningIcon size={20} color={t.c.warning} />
            <Txt v="bodyStrong" tone="warning">
              {tr('Днес е твърде много', 'Too much today')}
            </Txt>
          </Row>
          {alerts.map((a) => (
            <Txt key={a.k} v="small">
              {NUTRIENT_META[a.k].label}: {formatAmount(a.v, a.k)} {NUTRIENT_META[a.k].unit} ({tr('граница', 'limit')} {formatAmount(a.max, a.k)})
            </Txt>
          ))}
        </Card>
      )}

      <Button label={tr('Добави храна', 'Add food')} icon={<PlusIcon size={22} color={t.c.onAccent} />} onPress={() => router.navigate('/add')} style={{ marginBottom: 14 }} />

      {entries.length === 0 ? (
        <Card>
          <EmptyState
            emoji="🍽️"
            title={tr('Още няма записи за този ден', 'Nothing logged for this day yet')}
            text={tr('Добави храна от базата, с баркод или ръчно.', 'Add food from the database, by barcode or manually.')}
          >
            {yesterdayCount > 0 && (
              <Button label={tr('Копирай храните от предишния ден', 'Copy foods from the previous day')} variant="secondary" small icon={<CopyIcon size={18} color={t.c.text} />} onPress={copyYesterday} style={{ marginTop: 12 }} />
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
                {formatNumber(m.items.reduce((sum, e) => sum + e.n.kcal, 0))} {tr('ккал', 'kcal')}
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
          {tr('Докосни запис, за да промениш грамажа, да го повториш или изтриеш.', 'Tap an entry to change the amount, log it again or delete it.')}
        </Txt>
      )}

      <EntrySheet entry={editing} onClose={() => setEditing(null)} />
    </Screen>
  );
}

function MacroBar({ label, value, goal, color, strictMax }: { label: string; value: number; goal: number; color: string; strictMax?: boolean }) {
  const t = useTheme();
  const { tr } = useI18n();
  const over = goal > 0 && value > goal * 1.05;
  return (
    <View>
      <Row style={{ justifyContent: 'space-between', marginBottom: 4 }}>
        <Txt v="caption" tone="textMuted">
          {label}
        </Txt>
        <Txt v="caption" style={{ fontWeight: '700' }} color={over && strictMax ? t.c.warning : undefined}>
          {formatNumber(value)} / {formatNumber(goal)} {tr('г', 'g')}
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
