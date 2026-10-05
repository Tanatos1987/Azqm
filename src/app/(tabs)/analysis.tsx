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
  const verdicts = useMemo(() => analyzeNutrients(stats.avg, profile, diet, goals.calories), [stats, profile, diet, goals.calories]);
  const checks = useMemo(
    () => macroChecks(stats.avg, profile, diet, goals, profile ? bmrOf(profile) : null),
    [stats, profile, diet, goals]
  );
  const usedEntries = useMemo(() => {
    const dates = new Set(stats.avgDays.map((d) => d.date));
    return entries.filter((e) => dates.has(e.date));
  }, [entries, stats]);

  const low = verdicts.filter((v) => v.status === 'low').sort((a, b) => (a.pct ?? 1) - (b.pct ?? 1));
  const high = verdicts.filter((v) => v.status === 'high');
  const ok = verdicts.filter((v) => v.status === 'ok');

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
  }, [days, range]);

  const avg = stats.avg;
  const carbs = diet.carbBasis === 'net' ? netCarbsOf(avg) : avg.carbs;
  const split = avg.kcal > 0 ? { p: (avg.protein * 4) / avg.kcal, f: (avg.fat * 9) / avg.kcal, c: (carbs * 4) / avg.kcal } : null;
  const weekly = profile && avg.kcal > 0 && !diet.noCalories ? weeklyWeightChange(avg.kcal, tdeeOf(profile)) : null;

  return (
    <Screen title="Анализ" subtitle="Средни стойности и какво ти липсва" scroll>
      <Segmented<Period>
        value={period}
        onChange={setPeriod}
        style={{ marginBottom: 14 }}
        options={[
          { label: '7 дни', value: '7' },
          { label: '30 дни', value: '30' },
          { label: '90 дни', value: '90' },
          { label: 'Всичко', value: 'all' },
        ]}
      />

      {days.length === 0 ? (
        <Card>
          <EmptyState emoji="📊" title="Още няма данни за този период" text="Записвай храната си няколко дни и тук ще видиш средния прием, дефицитите и излишъците.">
            <Button label="Добави храна" small onPress={() => router.navigate('/add')} style={{ marginTop: 12 }} />
          </EmptyState>
        </Card>
      ) : (
        <>
          <Card>
            <Txt v="caption" tone="textMuted">
              Средно калории на ден
            </Txt>
            <Row gap={10} style={{ alignItems: 'flex-end' }}>
              <Txt v="display" tone="accent">
                {formatNumber(avg.kcal)}
              </Txt>
              <Txt v="body" tone="textMuted" style={{ marginBottom: 6 }}>
                ккал
              </Txt>
            </Row>
            <Txt v="small" tone="textMuted">
              {stats.avgDays.length} {stats.avgDays.length === 1 ? 'ден' : 'дни'} със записи
              {stats.todayExcluded ? ' · днешният ден не се брои, докато не приключи' : ''}
            </Txt>
            {!diet.noCalories && goals.calories > 0 && (
              <Txt v="smallStrong" style={{ marginTop: 6 }} tone={Math.abs(avg.kcal - goals.calories) / goals.calories < 0.1 ? 'success' : 'warning'}>
                {avg.kcal >= goals.calories ? '+' : '−'}
                {formatNumber(Math.abs(avg.kcal - goals.calories))} ккал спрямо целта ({formatNumber(goals.calories)})
              </Txt>
            )}
            <Txt v="caption" tone="textMuted" style={{ marginTop: 4 }}>
              Най-малко {formatNumber(stats.minKcal)} · най-много {formatNumber(stats.maxKcal)} ккал на ден
            </Txt>
            <View style={{ marginTop: 14 }}>
              <BarChart data={chart} color={t.c.accent} goal={diet.noCalories ? undefined : goals.calories} />
            </View>
            {weekly != null && (
              <Txt v="small" style={{ marginTop: 10 }}>
                При този прием теглото ще се променя с около{' '}
                <Txt v="smallStrong" tone={weekly <= 0 ? 'success' : 'warning'}>
                  {weekly > 0 ? '+' : '−'}
                  {formatNumber(Math.abs(weekly), 2)} кг седмично
                </Txt>{' '}
                (дневен разход ≈ {formatNumber(tdeeOf(profile!))} ккал).
              </Txt>
            )}
          </Card>

          <Card>
            <Txt v="h3" style={{ marginBottom: 12 }}>
              Макронутриенти средно на ден
            </Txt>
            <Row style={{ justifyContent: 'space-between', marginBottom: 14 }}>
              <MacroStat label="Протеин" value={avg.protein} color={t.c.protein} />
              <MacroStat label="Мазнини" value={avg.fat} color={t.c.fat} />
              <MacroStat label={diet.carbBasis === 'net' ? 'Нетни въгл.' : 'Въглехидр.'} value={carbs} color={t.c.carbs} />
              <MacroStat label="Фибри" value={avg.fiber} color={t.c.fiber} />
            </Row>
            {split && (
              <>
                <SplitBar label="Ти" p={split.p} f={split.f} c={split.c} />
                <SplitBar label="Цел" p={diet.split.protein} f={diet.split.fat} c={diet.split.carbs} />
                <Txt v="caption" tone="textMuted" style={{ marginTop: 6 }}>
                  Дял от калориите: синьо — протеин, оранжево — мазнини, розово — въглехидрати. Цел: „{diet.name}“.
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

          <SectionHeader title={low.length ? `Нуждаеш се от повече (${low.length})` : 'Нуждаеш се от повече'} />
          {low.length === 0 ? (
            <Card>
              <Txt tone="success">Всички следени витамини и минерали са поне 70% от препоръчителното. 👍</Txt>
            </Card>
          ) : (
            low.map((v) => <LowCard key={v.key} v={v} dietName={diet.name} sources={topSources(v.key, diet, FOODS, 4)} />)
          )}

          <SectionHeader title={high.length ? `Приемаш твърде много (${high.length})` : 'Приемаш твърде много'} />
          {high.length === 0 ? (
            <Card>
              <Txt tone="success">Нищо не надвишава горните граници. 👍</Txt>
            </Card>
          ) : (
            high.map((v) => <HighCard key={v.key} v={v} contributors={topContributors(usedEntries, v.target.maxKey ?? v.key)} avgOfMaxKey={v.target.maxKey ? avg[v.target.maxKey] : v.avg} />)
          )}

          <Pressable onPress={() => setShowOk((x) => !x)} style={{ marginTop: 8, marginBottom: 10 }} hitSlop={6}>
            <Row>
              <Txt v="h3" style={{ flex: 1 }}>
                В норма ({ok.length})
              </Txt>
              <Txt v="smallStrong" tone="accent">
                {showOk ? 'Скрий ▲' : 'Покажи ▼'}
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
                      {v.pct != null ? ` · ${Math.round(v.pct * 100)}%` : v.target.max ? ` · до ${formatAmount(v.target.max, v.key)}` : ''}
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
                  Пълни данни за витамини и минерали има за {Math.round(stats.microCoverage * 100)}% от калориите в периода. Храните от снимка, баркод или ръчно
                  въвеждане съдържат само калории и макроси, затова реалният прием на микронутриенти може да е по-висок.
                </Txt>
                <Txt v="small" tone="textMuted">
                  Препоръчителните стойности са за възрастни (RDA/AI и горни граници UL), според пола и възрастта от профила. Това е ориентир, а не медицински съвет.
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
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Txt v="h2" color={color}>
        {formatNumber(value)}
      </Txt>
      <Txt v="caption" tone="textMuted">
        г {label.toLowerCase()}
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
        Средно {formatAmount(v.avg, v.key)} {m.unit} на ден при препоръка {formatAmount(v.target.min ?? 0, v.key)} {m.unit}.
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
              Добри източници, подходящи за „{dietName}“:
            </Txt>
          </Row>
          {sources.map((src) => (
            <Txt key={src.food.id} v="small" tone="textMuted">
              • {src.food.name} — {formatAmount(src.amount, v.key)} {m.unit} в {src.portionLabel.endsWith(' г') ? src.portionLabel : `${src.portionLabel} (${formatNumber(src.portionGrams)} г)`}
            </Txt>
          ))}
        </View>
      )}
    </Card>
  );
}

function HighCard({ v, contributors, avgOfMaxKey }: { v: NutrientVerdict; contributors: ReturnType<typeof topContributors>; avgOfMaxKey: number }) {
  const t = useTheme();
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
        Средно {formatAmount(avgOfMaxKey, v.target.maxKey ?? v.key)} {maxMeta.unit} на ден
        {v.target.maxKey ? ` (${maxMeta.label.toLowerCase()})` : ''} при горна граница {formatAmount(max, v.target.maxKey ?? v.key)} {maxMeta.unit}.
      </Txt>
      {v.target.note ? (
        <Txt v="small" style={{ marginTop: 6 }}>
          {v.target.note}
        </Txt>
      ) : null}
      {contributors.length > 0 && (
        <Txt v="small" tone="textMuted" style={{ marginTop: 8 }}>
          Основно от: {contributors.map((c) => `${c.name} (${Math.round(c.share * 100)}%)`).join(', ')}
        </Txt>
      )}
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  note: { backgroundColor: t.c.surfaceAlt, marginTop: 8 },
}));
