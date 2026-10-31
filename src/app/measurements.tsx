import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Button, Card, Chip, IconButton, Input, Row, Screen, SectionHeader, Txt } from '@/components/ui';
import { LineChart } from '@/components/charts/LineChart';
import { ChevronLeftIcon, TrashIcon } from '@/components/icons';
import { ProLock } from '@/components/ProLock';
import { useDataRefresh } from '@/context/DataRefreshContext';
import { usePro } from '@/context/ProContext';
import { useProfile } from '@/context/ProfileContext';
import { useToast } from '@/context/ToastContext';
import { MEASURE_KEYS, measureHint, measureLabel, measurementsTeaser } from '@/data/measurements';
import { deleteMeasurement, getMeasurements, saveMeasurement } from '@/db/queries';
import { useTheme } from '@/theme/ThemeContext';
import type { BodyMeasurement, MeasureKey } from '@/types';
import { bodyFatCategory, navyBodyFat } from '@/utils/bodyFat';
import { formatDateLabel, formatNumber, shortDate, todayKey } from '@/utils/date';
import { useI18n } from '@/i18n';

type Series = MeasureKey | 'fat';
type Draft = Partial<Record<MeasureKey, string>>;

/** Body measurements (Pro): today's (or an earlier day's) tape measurements, body fat %, a chart and the history. */
export default function MeasurementsScreen() {
  const t = useTheme();
  const db = useSQLiteContext();
  const { tr } = useI18n();
  const toast = useToast();
  const { isPro } = usePro();
  const { profile } = useProfile();
  const { version, bump } = useDataRefresh();
  const [rows, setRows] = useState<BodyMeasurement[]>([]);
  const [date, setDate] = useState(todayKey());
  const [draft, setDraft] = useState<Draft>({});
  const [series, setSeries] = useState<Series>('waist');

  const load = useCallback(async () => setRows(await getMeasurements(db)), [db]);
  useEffect(() => {
    // Refetch whenever data changes; setState happens after the awaited query.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load, version]);

  const fat = useMemo(
    () => (profile ? rows.map((r) => ({ date: r.date, bf: navyBodyFat(profile.sex, profile.heightCm, r.values) })).filter((p): p is { date: string; bf: number } => p.bf != null) : []),
    [rows, profile]
  );

  const back = (
    <IconButton onPress={() => router.back()} accessibilityLabel={tr('Назад', 'Back')}>
      <ChevronLeftIcon size={24} color={t.c.text} />
    </IconButton>
  );

  if (!isPro || !profile) {
    return (
      <Screen title={tr('Обиколки', 'Measurements')} scroll left={back}>
        <ProLock emoji="📏" title={tr('Обиколки и % мазнини', 'Measurements and body fat')} text={measurementsTeaser()} />
      </Screen>
    );
  }

  /** The latest value of each measurement, as the placeholder of its field. */
  const lastOf = (k: MeasureKey) => [...rows].reverse().find((r) => r.values[k] != null)?.values[k];
  const today = todayKey();

  const editDay = (r: BodyMeasurement) => {
    setDate(r.date);
    setDraft(Object.fromEntries(MEASURE_KEYS.filter((k) => r.values[k] != null).map((k) => [k, formatNumber(r.values[k]!, 1)])));
  };

  const save = async () => {
    const values: BodyMeasurement['values'] = {};
    for (const k of MEASURE_KEYS) {
      const raw = (draft[k] ?? '').trim();
      if (!raw) continue;
      const cm = Number(raw.replace(',', '.'));
      if (!(cm >= 10 && cm <= 250)) {
        Alert.alert(measureLabel(k), tr('Въведи обиколката в сантиметри (10–250).', 'Enter the measurement in centimetres (10–250).'));
        return;
      }
      values[k] = cm;
    }
    if (Object.keys(values).length === 0) {
      Alert.alert(tr('Обиколки', 'Measurements'), tr('Въведи поне една обиколка.', 'Enter at least one measurement.'));
      return;
    }
    await saveMeasurement(db, { date, values });
    bump();
    setDraft({});
    setDate(today);
    toast.show(tr('Обиколките са записани', 'Measurements saved'));
  };

  const remove = (r: BodyMeasurement) =>
    Alert.alert(tr('Изтриване', 'Delete'), tr('Да изтрия ли обиколките от {date}?', 'Delete the measurements from {date}?', { date: formatDateLabel(r.date) }), [
      { text: tr('Отказ', 'Cancel'), style: 'cancel' },
      {
        text: tr('Изтрий', 'Delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteMeasurement(db, r.date);
          bump();
        },
      },
    ]);

  const latestFat = fat[fat.length - 1];
  const category = latestFat ? bodyFatCategory(profile.sex, latestFat.bf) : null;
  const toneColor = category ? { info: t.c.info, success: t.c.success, warning: t.c.warning, danger: t.c.danger }[category.tone] : t.c.text;
  const points =
    series === 'fat'
      ? fat.map((p) => ({ label: shortDate(p.date), value: p.bf }))
      : rows.filter((r) => r.values[series] != null).map((r) => ({ label: shortDate(r.date), value: r.values[series]! }));

  return (
    <Screen title={tr('Обиколки', 'Measurements')} subtitle={tr('Сантиметър и % телесни мазнини', 'Tape measure and body fat %')} scroll left={back}>
      <Card style={{ gap: 14 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt v="h3">{formatDateLabel(date)}</Txt>
          {date !== today && (
            <Pressable
              onPress={() => {
                setDate(today);
                setDraft({});
              }}
              hitSlop={10}
            >
              <Txt v="smallStrong" tone="accent">
                {tr('Нов запис за днес', 'New entry for today')}
              </Txt>
            </Pressable>
          )}
        </Row>
        {MEASURE_KEYS.map((k) => {
          const last = lastOf(k);
          return (
            <Row key={k} gap={12}>
              <View style={{ flex: 1 }}>
                <Txt v="bodyStrong">{measureLabel(k)}</Txt>
                <Txt v="caption" tone="textMuted">
                  {measureHint(k)}
                </Txt>
              </View>
              <Input
                value={draft[k] ?? ''}
                onChangeText={(v) => setDraft((d) => ({ ...d, [k]: v }))}
                keyboardType="decimal-pad"
                placeholder={last != null ? formatNumber(last, 1) : tr('см', 'cm')}
                style={{ width: 96, textAlign: 'center' }}
              />
            </Row>
          );
        })}
        <Txt v="caption" tone="textMuted">
          {tr('Мери сутрин, преди закуска. Сантиметърът да прилепва, без да стяга.', 'Measure in the morning, before breakfast, with the tape snug but not tight.')}
        </Txt>
        <Button label={tr('Запази', 'Save')} onPress={save} />
      </Card>

      <SectionHeader title={tr('% телесни мазнини', 'Body fat %')} />
      <Card style={{ gap: 6 }}>
        {latestFat && category ? (
          <>
            <Row gap={10} style={{ alignItems: 'baseline' }}>
              <Txt v="display">{formatNumber(latestFat.bf, 1)} %</Txt>
              <Txt v="bodyStrong" color={toneColor}>
                {category.label}
              </Txt>
            </Row>
            {fat.length > 1 && (
              <Txt v="smallStrong" tone={latestFat.bf <= fat[0].bf ? 'success' : 'warning'}>
                {latestFat.bf <= fat[0].bf ? '▼' : '▲'} {formatNumber(Math.abs(latestFat.bf - fat[0].bf), 1)} {tr('пункта от {date}', 'points since {date}', { date: formatDateLabel(fat[0].date) })}
              </Txt>
            )}
          </>
        ) : null}
        <Txt v="small" tone="textMuted">
          {profile.sex === 'male'
            ? tr(
                'Оценка по метода на американския флот от ръста ти, талията и врата. Обикновено е в рамките на няколко процента от точните измервания.',
                'US Navy method estimate from your height, waist and neck. It is usually within a few percent of precise measurements.'
              )
            : tr(
                'Оценка по метода на американския флот от ръста ти, талията, ханша и врата. Обикновено е в рамките на няколко процента от точните измервания.',
                'US Navy method estimate from your height, waist, hips and neck. It is usually within a few percent of precise measurements.'
              )}
        </Txt>
      </Card>

      {rows.length > 0 && (
        <>
          <SectionHeader title={tr('Графика', 'Chart')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0 }} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
            {[...MEASURE_KEYS, 'fat' as const].map((k) => (
              <Chip key={k} label={k === 'fat' ? tr('% мазнини', 'Body fat') : measureLabel(k)} active={series === k} onPress={() => setSeries(k)} />
            ))}
          </ScrollView>
          <Card>
            {points.length > 0 ? (
              <LineChart key={`${series}-${points.length}`} data={points.slice(-30)} color={t.c.accent} unit={series === 'fat' ? '%' : tr('см', 'cm')} />
            ) : (
              <Txt tone="textMuted" center style={{ paddingVertical: 24 }}>
                {tr('Още няма стойности за това.', 'No values for this yet.')}
              </Txt>
            )}
          </Card>

          <SectionHeader title={tr('История', 'History')} />
          <Card>
            {[...rows].reverse().map((r, i) => (
              <Row key={r.date} gap={10} style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: t.c.border }}>
                <Pressable onPress={() => editDay(r)} style={{ flex: 1 }}>
                  <Txt v="bodyStrong">{formatDateLabel(r.date)}</Txt>
                  <Txt v="small" tone="textMuted">
                    {MEASURE_KEYS.filter((k) => r.values[k] != null)
                      .map((k) => `${measureLabel(k)} ${formatNumber(r.values[k]!, 1)}`)
                      .join(' · ')}
                  </Txt>
                </Pressable>
                <Pressable onPress={() => remove(r)} hitSlop={10}>
                  <TrashIcon size={20} color={t.c.textFaint} />
                </Pressable>
              </Row>
            ))}
          </Card>
          <Txt v="caption" tone="textFaint" center>
            {tr('Докосни ден, за да поправиш обиколките му.', 'Tap a day to correct its measurements.')}
          </Txt>
        </>
      )}
    </Screen>
  );
}
