import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Bar, Button, Card, EmptyState, Row, Screen, SectionHeader, Segmented, Txt } from '@/components/ui';
import { BarChart } from '@/components/charts/BarChart';
import { InfoIcon, LeafIcon, WarningIcon } from '@/components/icons';
import { useSettings } from '@/context/SettingsContext';
import { useProfile } from '@/context/ProfileContext';
import { useDataRefresh } from '@/context/DataRefreshContext';
import { useI18n } from '@/i18n';
import { getDaySummaries, getEntriesBetween, getFirstEntryDate, getHydrationByDay } from '@/db/queries';
import { getDiet } from '@/data/diets';
import { FOODS } from '@/data/foods';
import { NUTRIENT_META, formatAmount, netCarbsOf } from '@/data/nutrients';
import { makeStyles, useTheme } from '@/theme/ThemeContext';
import type { DaySummary, FoodEntry, HydrationTotals } from '@/types';
import {
  analyzeNutrients,
  computePeriodStats,
  macroChecks,
  topContributors,
  topSources,
  weeklyWeightChange,
  type NutrientVerdict,
} from '@/utils/analysis';
import { bmrOf, tdeeOf } from '@/utils/bodyMetrics';
import { daysBetween, formatNumber, shiftDateKey, shortDate, todayKey, weekdayShort } from '@/utils/date';

type Period = '7' | '30' | '90' | 'all';

export default function AnalysisScreen() {
  const t = useTheme();
  const s = useStyles();
  const { lang, tr } = useI18n();
  const db = useSQLiteContext();
  const { goals, dietId } = useSettings();
  const { profile } = useProfile();
  const { version } = useDataRefresh();
  const diet = getDiet(dietId);
  const [period, setPeriod] = useState<Period>('7');
  const [range, setRange] = useState<{ from: string; to: string }>({ from: todayKey(), to: todayKey() });
  const [days, setDays] = useState<DaySummary[]>([]);
  const [hydration, setHydration] = useState<Map<string, HydrationTotals>>(() => new Map());
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [showOk, setShowOk] = useState(false);

  const load = useCallback(async () => {
    const to = todayKey();
    let from = shiftDateKey(to, -(Number(period) - 1 || 0));
    if (period === 'all') from = (await getFirstEntryDate(db)) ?? to;
    const [d, h, e] = await Promise.all([getDaySummaries(db, from, to), getHydrationByDay(db, from, to), getEntriesBetween(db, from, to)]);
    setRange({ from, to });
    setDays(d);
    setHydration(h);
    setEntries(e);
  }, [db, period]);

  useEffect(() => {
    // Refetch when the period or the data changes; state is set after the awaited queries.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load, version]);

  const stats = useMemo(() => computePeriodStats(days, hydration), [days, hydration]);
  const verdicts = useMemo(() => analyzeNutrients(stats.avg, profile, diet, goals.calories), [stats, profile, diet, goals.calories, lang]);
  const checks = useMemo(
    () => macroChecks(stats.avg, profile, diet, goals, profile ? bmrOf(profile) : null),
    [stats, profile, diet, goals, lang]
  );
  const usedEntries = useMemo(() => {
    const dates = new Set(stats.avgDays.map((d) => d.date));
    return entries.filter((e) => dates.has(e.date));
  }, [entries, stats]);

  const { low, high, ok } = useMemo(
    () => ({
      low: verdicts.filter((v) => v.status === 'low').sort((a, b) => (a.pct ?? 1) - (b.pct ?? 1)),
      high: verdicts.filter((v) => v.status === 'high'),
      ok: verdicts.filter((v) => v.status === 'ok'),
    }),
    [verdicts]
  );
  // Each lookup scans the whole food database, so compute once per result instead of on every render.
  const sourcesByKey = useMemo(() => new Map(low.map((v) => [v.key, topSources(v.key, diet, FOODS, 4)])), [low, diet, lang]);
  const contributorsByKey = useMemo(
    () => new Map(high.map((v) => [v.key, topContributors(usedEntries, v.target.maxKey ?? v.key)])),
    [high, usedEntries, lang]
  );

  // Chart: one bar per day for short periods, weekly averages for long ones.
  const chart = useMemo(() => {
    const span = daysBetween(range.from, range.to) + 1;
    const byDate = new Map(days.map((d) => [d.date, d.n.kcal]));
    if (span <= 31) {
      return Array.from({ length: span }, (_, i) => {
        const date = shiftDateKey(range.from, i);
        return { label: span <= 7 ? weekdayShort(date) : shortDate(date), value: byDate.get(date) ?? 0 };
      });
    }
    const weeks: { label: string; value: number }[] = [];
    for (let start = 0; start < span; start += 7) {
      const vals: number[] = [];
      for (let i = start; i < Math.min(start + 7, span); i++) {
        const v = byDate.get(shiftDateKey(range.from, i));
        if (v) vals.push(v);
      }
      weeks.push({ label: shortDate(shiftDateKey(range.from, start)), value: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0 });
    }
    return weeks;
  }, [days, range, lang]);

  const avg = stats.avg;
  const carbs = diet.carbBasis === 'net' ? netCarbsOf(avg) : avg.carbs;
  const split = avg.kcal > 0 ? { p: (avg.protein * 4) / avg.kcal, f: (avg.fat * 9) / avg.kcal, c: (carbs * 4) / avg.kcal } : null;
  const weekly = profile && avg.kcal > 0 && !diet.noCalories ? weeklyWeightChange(avg.kcal, tdeeOf(profile)) : null;

  return (
    <Screen title={tr('Анализ', 'Analysis')} subtitle={tr('Средни стойности и какво ти липсва', 'Averages and what you are missing')} scroll>
      <Segmented<Period>
        value={period}
        onChange={setPeriod}
        style={{ marginBottom: 14 }}
        options={[
          { label: tr('7 дни', '7 days'), value: '7' },
          { label: tr('30 дни', '30 days'), value: '30' },
          { label: tr('90 дни', '90 days'), value: '90' },
          { label: tr('Всичко', 'All'), value: 'all' },
        ]}
      />

      {days.length === 0 ? (
        <Card>
          <EmptyState
            emoji="📊"
            title={tr('Още няма данни за този период', 'No data for this period yet')}
            text={tr(
              'Записвай храната си няколко дни и тук ще видиш средния прием, дефицитите и излишъците.',
              'Log your food for a few days and you will see your average intake, shortfalls and excesses here.'
            )}
          >
            <Button label={tr('Добави храна', 'Add food')} small onPress={() => router.navigate('/add')} style={{ marginTop: 12 }} />
          </EmptyState>
        </Card>
      ) : (
        <>
          <Card>
            <Txt v="caption" tone="textMuted">
              {tr('Средно калории на ден', 'Average calories per day')}
            </Txt>
            <Row gap={10} style={{ alignItems: 'flex-end' }}>
              <Txt v="display" tone="accent">
                {formatNumber(avg.kcal)}
              </Txt>
              <Txt v="body" tone="textMuted" style={{ marginBottom: 6 }}>
                {tr('ккал', 'kcal')}
              </Txt>
            </Row>
            <Txt v="small" tone="textMuted">
              {stats.avgDays.length}{' '}
              {stats.avgDays.length === 1 ? tr('ден със записи', 'day with entries') : tr('дни със записи', 'days with entries')}
              {stats.todayExcluded ? tr(' · днешният ден не се брои, докато не приключи', ' · today is not counted until it is over') : ''}
            </Txt>
            {!diet.noCalories && goals.calories > 0 && (
              <Txt v="smallStrong" style={{ marginTop: 6 }} tone={Math.abs(avg.kcal - goals.calories) / goals.calories < 0.1 ? 'success' : 'warning'}>
                {avg.kcal >= goals.calories ? '+' : '−'}
                {formatNumber(Math.abs(avg.kcal - goals.calories))} {tr('ккал спрямо целта', 'kcal vs. goal')} ({formatNumber(goals.calories)})
              </Txt>
            )}
            <Txt v="caption" tone="textMuted" style={{ marginTop: 4 }}>
              {tr('Най-малко', 'Lowest')} {formatNumber(stats.minKcal)} · {tr('най-много', 'highest')} {formatNumber(stats.maxKcal)} {tr('ккал на ден', 'kcal per day')}
            </Txt>
            <View style={{ marginTop: 14 }}>
              <BarChart data={chart} color={t.c.accent} goal={diet.noCalories ? undefined : goals.calories} />
            </View>
            {weekly != null && (
              <Txt v="small" style={{ marginTop: 10 }}>
                {tr('При този прием теглото ще се променя с около', 'At this intake your weight will change by about')}{' '}
                <Txt v="smallStrong" tone={weekly <= 0 ? 'success' : 'warning'}>
                  {weekly > 0 ? '+' : '−'}
                  {formatNumber(Math.abs(weekly), 2)} {tr('кг седмично', 'kg per week')}
                </Txt>{' '}
                ({tr('дневен разход', 'daily expenditure')} ≈ {formatNumber(tdeeOf(profile!))} {tr('ккал', 'kcal')}).
              </Txt>
            )}
          </Card>

          <Card>
            <Txt v="h3" style={{ marginBottom: 12 }}>
              {tr('Макронутриенти средно на ден', 'Average macros per day')}
            </Txt>
            <Row style={{ justifyContent: 'space-between', marginBottom: 14 }}>
              <MacroStat label={tr('Протеин', 'Protein')} value={avg.protein} color={t.c.protein} />
              <MacroStat label={tr('Мазнини', 'Fat')} value={avg.fat} color={t.c.fat} />
              <MacroStat label={diet.carbBasis === 'net' ? tr('Нетни въгл.', 'Net carbs') : tr('Въглехидр.', 'Carbs')} value={carbs} color={t.c.carbs} />
              <MacroStat label={tr('Фибри', 'Fiber')} value={avg.fiber} color={t.c.fiber} />
            </Row>
            {split && (
              <>
                <SplitBar label={tr('Ти', 'You')} p={split.p} f={split.f} c={split.c} />
                <SplitBar label={tr('Цел', 'Goal')} p={diet.split.protein} f={diet.split.fat} c={diet.split.carbs} />
                <Txt v="caption" tone="textMuted" style={{ marginTop: 6 }}>
                  {tr(
                    `Дял от калориите: синьо — протеин, оранжево — мазнини, розово — въглехидрати. Цел: „${diet.name}“.`,
                    `Share of calories: blue — protein, orange — fat, pink — carbs. Goal: “${diet.name}”.`
                  )}
                </Txt>
              </>
            )}
          </Card>

          {checks.length > 0 && (
            <Card style={{ backgroundColor: t.c.warningSoft }}>
              {checks.map((c, i) => (
                <Row key={i} gap={10} style={{ alignItems: 'flex-start', marginBottom: i < checks.length - 1 ? 10 : 0 }}>
                  {c.kind === 'warning' ? <WarningIcon size={20} color={t.c.warning} /> : <InfoIcon size={20} color={t.c.info} />}
                  <Txt v="small" style={{ flex: 1 }}>
                    {c.text}
                  </Txt>
                </Row>
              ))}
            </Card>
          )}

          <SectionHeader title={low.length ? tr(`Нуждаеш се от повече (${low.length})`, `You need more (${low.length})`) : tr('Нуждаеш се от повече', 'You need more')} />
          {low.length === 0 ? (
            <Card>
              <Txt tone="success">
                {tr('Всички следени витамини и минерали са поне 70% от препоръчителното. 👍', 'All tracked vitamins and minerals are at least 70% of the recommended amount. 👍')}
              </Txt>
            </Card>
          ) : (
            low.map((v) => <LowCard key={v.key} v={v} dietName={diet.name} sources={sourcesByKey.get(v.key) ?? []} />)
          )}

          <SectionHeader title={high.length ? tr(`Приемаш твърде много (${high.length})`, `Too much (${high.length})`) : tr('Приемаш твърде много', 'Too much')} />
          {high.length === 0 ? (
            <Card>
              <Txt tone="success">{tr('Нищо не надвишава горните граници. 👍', 'Nothing goes over the upper limits. 👍')}</Txt>
            </Card>
          ) : (
            high.map((v) => <HighCard key={v.key} v={v} contributors={contributorsByKey.get(v.key) ?? []} avgOfMaxKey={v.target.maxKey ? avg[v.target.maxKey] : v.avg} />)
          )}

          <Pressable onPress={() => setShowOk((x) => !x)} style={{ marginTop: 8, marginBottom: 10 }} hitSlop={6}>
            <Row>
              <Txt v="h3" style={{ flex: 1 }}>
                {tr('В норма', 'On track')} ({ok.length})
              </Txt>
              <Txt v="smallStrong" tone="accent">
                {showOk ? tr('Скрий ▲', 'Hide ▲') : tr('Покажи ▼', 'Show ▼')}
              </Txt>
            </Row>
          </Pressable>
          {showOk && (
            <Card>
              {ok.map((v) => (
                <View key={v.key} style={{ marginBottom: 12 }}>
                  <Row style={{ justifyContent: 'space-between', marginBottom: 4 }}>
                    <Txt v="small">{NUTRIENT_META[v.key].label}</Txt>
                    <Txt v="caption" tone="textMuted">
                      {formatAmount(v.avg, v.key)} {NUTRIENT_META[v.key].unit}
                      {v.pct != null ? ` · ${Math.round(v.pct * 100)}%` : v.target.max ? ` · ${tr('до', 'up to')} ${formatAmount(v.target.max, v.key)}` : ''}
                    </Txt>
                  </Row>
                  <Bar value={v.pct ?? v.avg / (v.target.max ?? 1)} max={1} height={6} color={t.c.success} />
                </View>
              ))}
            </Card>
          )}

          <Card style={s.note}>
            <Row gap={10} style={{ alignItems: 'flex-start' }}>
              <InfoIcon size={20} color={t.c.textMuted} />
              <View style={{ flex: 1, gap: 6 }}>
                <Txt v="small" tone="textMuted">
                  {tr(
                    `Пълни данни за витамини и минерали има за ${Math.round(stats.microCoverage * 100)}% от калориите в периода. Храните от снимка, баркод или ръчно въвеждане съдържат само калории и макроси, затова реалният прием на микронутриенти може да е по-висок.`,
                    `Full vitamin and mineral data covers ${Math.round(stats.microCoverage * 100)}% of the calories in this period. Foods from a photo, barcode or manual entry only have calories and macros, so your real micronutrient intake may be higher.`
                  )}
                </Txt>
                <Txt v="small" tone="textMuted">
                  {tr(
                    'Препоръчителните стойности са за възрастни (RDA/AI и горни граници UL), според пола и възрастта от профила. Това е ориентир, а не медицински съвет.',
                    'Recommended values are for adults (RDA/AI and UL upper limits), based on the sex and age in your profile. They are a guide, not medical advice.'
                  )}
                </Txt>
              </View>
            </Row>
          </Card>
        </>
      )}
    </Screen>
  );
}

function MacroStat({ label, value, color }: { label: string; value: number; color: string }) {
  const { tr } = useI18n();
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Txt v="h2" color={color}>
        {formatNumber(value)}
      </Txt>
      <Txt v="caption" tone="textMuted">
        {tr('г', 'g')} {label.toLowerCase()}
      </Txt>
    </View>
  );
}

function SplitBar({ label, p, f, c }: { label: string; p: number; f: number; c: number }) {
  const t = useTheme();
  const total = p + f + c || 1;
  const seg = (v: number, color: string) => (v > 0 ? <View style={{ flex: v / total, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>{v / total > 0.09 ? <Txt v="caption" color="#fff" style={{ fontWeight: '700' }}>{Math.round((v / total) * 100)}%</Txt> : null}</View> : null);
  return (
    <Row gap={10} style={{ marginBottom: 8 }}>
      <Txt v="caption" tone="textMuted" style={{ width: 34 }}>
        {label}
      </Txt>
      <View style={{ flex: 1, height: 24, borderRadius: 12, overflow: 'hidden', flexDirection: 'row', backgroundColor: t.c.track }}>
        {seg(p, t.c.protein)}
        {seg(f, t.c.fat)}
        {seg(c, t.c.carbs)}
      </View>
    </Row>
  );
}

function LowCard({ v, sources, dietName }: { v: NutrientVerdict; sources: ReturnType<typeof topSources>; dietName: string }) {
  const t = useTheme();
  const { tr } = useI18n();
  const m = NUTRIENT_META[v.key];
  const pct = v.pct ?? 0;
  return (
    <Card>
      <Row style={{ marginBottom: 6 }}>
        <Txt v="h3" style={{ flex: 1 }}>
          {m.label}
        </Txt>
        <Txt v="h3" tone={pct < 0.4 ? 'danger' : 'warning'}>
          {Math.round(pct * 100)}%
        </Txt>
      </Row>
      <Bar value={pct} max={1} color={pct < 0.4 ? t.c.danger : t.c.warning} height={8} />
      <Txt v="small" tone="textMuted" style={{ marginTop: 8 }}>
        {tr('Средно', 'Average')} {formatAmount(v.avg, v.key)} {m.unit} {tr('на ден при препоръка', 'per day vs. recommended')} {formatAmount(v.target.min ?? 0, v.key)} {m.unit}.
      </Txt>
      <Txt v="small" style={{ marginTop: 6 }}>
        {m.info}
      </Txt>
      {v.target.note ? (
        <Txt v="caption" tone="textMuted" style={{ marginTop: 4 }}>
          {v.target.note}
        </Txt>
      ) : null}
      {sources.length > 0 && (
        <View style={{ marginTop: 10, gap: 4 }}>
          <Row gap={6}>
            <LeafIcon size={16} color={t.c.success} />
            <Txt v="caption" tone="success" style={{ fontWeight: '700' }}>
              {tr(`Добри източници, подходящи за „${dietName}“:`, `Good sources that suit “${dietName}”:`)}
            </Txt>
          </Row>
          {sources.map((src) => (
            <Txt key={src.food.id} v="small" tone="textMuted">
              • {src.food.name} — {formatAmount(src.amount, v.key)} {m.unit} {tr('в', 'in')}{' '}
              {src.portionLabel.endsWith(tr(' г', ' g')) ? src.portionLabel : `${src.portionLabel} (${formatNumber(src.portionGrams)} ${tr('г', 'g')})`}
            </Txt>
          ))}
        </View>
      )}
    </Card>
  );
}

function HighCard({ v, contributors, avgOfMaxKey }: { v: NutrientVerdict; contributors: ReturnType<typeof topContributors>; avgOfMaxKey: number }) {
  const t = useTheme();
  const { tr } = useI18n();
  const m = NUTRIENT_META[v.key];
  const max = v.target.max ?? 1;
  const maxMeta = NUTRIENT_META[v.target.maxKey ?? v.key];
  return (
    <Card style={{ borderWidth: 1, borderColor: t.c.danger }}>
      <Row style={{ marginBottom: 6 }}>
        <Txt v="h3" style={{ flex: 1 }}>
          {m.label}
        </Txt>
        <Txt v="h3" tone="danger">
          {Math.round((avgOfMaxKey / max) * 100)}%
        </Txt>
      </Row>
      <Bar value={avgOfMaxKey} max={avgOfMaxKey} color={t.c.danger} height={8} marker={max} />
      <Txt v="small" tone="textMuted" style={{ marginTop: 8 }}>
        {tr('Средно', 'Average')} {formatAmount(avgOfMaxKey, v.target.maxKey ?? v.key)} {maxMeta.unit} {tr('на ден', 'per day')}
        {v.target.maxKey ? ` (${maxMeta.label.toLowerCase()})` : ''} {tr('при горна граница', 'vs. upper limit')} {formatAmount(max, v.target.maxKey ?? v.key)} {maxMeta.unit}.
      </Txt>
      {v.target.note ? (
        <Txt v="small" style={{ marginTop: 6 }}>
          {v.target.note}
        </Txt>
      ) : null}
      {contributors.length > 0 && (
        <Txt v="small" tone="textMuted" style={{ marginTop: 8 }}>
          {tr('Основно от:', 'Mostly from:')} {contributors.map((c) => `${c.name} (${Math.round(c.share * 100)}%)`).join(', ')}
        </Txt>
      )}
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  note: { backgroundColor: t.c.surfaceAlt, marginTop: 8 },
}));
