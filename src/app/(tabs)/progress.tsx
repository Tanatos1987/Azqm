import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { router } from 'expo-router';
import { Button, Card, IconButton, Input, Row, Screen, SectionHeader, Txt } from '@/components/ui';
import { BodyFigure } from '@/components/BodyFigure';
import { HelpButton } from '@/components/HelpButton';
import { LineChart } from '@/components/charts/LineChart';
import { CameraIcon, CheckIcon, CompareIcon, TrashIcon, UserIcon } from '@/components/icons';
import { ProLock } from '@/components/ProLock';
import { useProfile } from '@/context/ProfileContext';
import { useDataRefresh } from '@/context/DataRefreshContext';
import { usePro } from '@/context/ProContext';
import { MEASURE_KEYS, measureLabel, measurementsTeaser } from '@/data/measurements';
import { deleteWeightEntry, getMeasurements, getProgressPhotos, getWeightEntries } from '@/db/queries';
import { useTheme } from '@/theme/ThemeContext';
import { bodyFatCategory, navyBodyFat } from '@/utils/bodyFat';
import { bmiCategory, bmiOf, healthyWeightRange } from '@/utils/bodyMetrics';
import { dateOf, formatDateLabel, formatDayMonth, formatNumber, shortDate, todayKey } from '@/utils/date';
import { POSES, photoUri, poseLabel } from '@/utils/progressPhotos';
import { forecastWeight, weightTrend, type TrendPoint } from '@/utils/weightTrend';
import type { BodyMeasurement, ProgressPhoto, UserProfile, WeightEntry } from '@/types';
import { useI18n } from '@/i18n';

export default function ProgressScreen() {
  const t = useTheme();
  const db = useSQLiteContext();
  const { profile, updateWeight, saveProfile } = useProfile();
  const { version, bump } = useDataRefresh();
  const { tr } = useI18n();
  const { isPro } = usePro();
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [weightDraft, setWeightDraft] = useState('');

  const load = useCallback(async () => {
    const [w, p, m] = await Promise.all([getWeightEntries(db), getProgressPhotos(db), getMeasurements(db)]);
    setWeights(w);
    setPhotos(p);
    setMeasurements(m);
  }, [db]);
  const trend = useMemo(() => weightTrend(weights), [weights]);

  useEffect(() => {
    // Refetch whenever data changes; setState happens after the awaited query.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load, version]);

  if (!profile) return null;

  const currentWeight = weights.length > 0 ? weights[weights.length - 1].weightKg : profile.weightKg;
  const startWeight = weights.length > 0 ? weights[0].weightKg : profile.weightKg;
  const bmi = bmiOf(currentWeight, profile.heightCm);
  const category = bmiCategory(bmi);
  const toneColor = { info: t.c.info, success: t.c.success, warning: t.c.warning, danger: t.c.danger }[category.tone];
  const [healthyMin, healthyMax] = healthyWeightRange(profile.heightCm);
  const change = currentWeight - startWeight;
  const toGoal = profile.targetWeightKg != null ? currentWeight - profile.targetWeightKg : null;

  const saveWeight = async () => {
    const kg = Number(weightDraft.replace(',', '.'));
    if (!(kg >= 30 && kg <= 300)) {
      Alert.alert(tr('Тегло', 'Weight'), tr('Въведи тегло в килограми (30–300).', 'Enter your weight in kilograms (30–300).'));
      return;
    }
    await updateWeight(kg);
    setWeightDraft('');
  };

  const removeWeight = (w: WeightEntry) =>
    Alert.alert(tr('Изтриване', 'Delete'), tr('Да изтрия ли записа {kg} кг от {date}?', 'Delete the {kg} kg entry from {date}?', { kg: formatNumber(w.weightKg, 1), date: formatDateLabel(w.date) }), [
      { text: tr('Отказ', 'Cancel'), style: 'cancel' },
      {
        text: tr('Изтрий', 'Delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteWeightEntry(db, w.date);
          bump();
        },
      },
    ]);

  const recalcGoals = () =>
    Alert.alert(
      tr('Преизчисляване', 'Recalculate'),
      tr(
        'Да изчисля ли наново дневните цели с текущото тегло {kg} кг? Ръчно зададените цели ще бъдат заменени.',
        'Recalculate your daily goals with your current weight of {kg} kg? Goals you set manually will be replaced.',
        { kg: formatNumber(currentWeight, 1) }
      ),
      [
        { text: tr('Отказ', 'Cancel'), style: 'cancel' },
        { text: tr('Преизчисли', 'Recalculate'), onPress: () => saveProfile({ ...profile, weightKg: currentWeight }) },
      ]
    );

  return (
    <Screen
      title={tr('Прогрес', 'Progress')}
      subtitle={tr('Тегло и индекс на телесна маса', 'Weight and body mass index')}
      scroll
      right={
        <Row gap={10}>
          <HelpButton section="progress" />
          <IconButton onPress={() => router.push('/profile')} accessibilityLabel={tr('Профил', 'Profile')}>
            <UserIcon size={22} color={t.c.text} />
          </IconButton>
        </Row>
      }
    >
      <Card>
        <Row gap={8}>
          <BodyFigure bmi={bmi} sex={profile.sex} size={210} fromBmi={22} />
          <View style={{ flex: 1, gap: 4 }}>
            <Txt v="caption" tone="textMuted">
              BMI
            </Txt>
            <Txt v="display">{bmi.toFixed(1)}</Txt>
            <Txt v="bodyStrong" color={toneColor}>
              {category.label}
            </Txt>
            <Txt v="small" tone="textMuted" style={{ marginTop: 6 }}>
              {tr('Сега', 'Now')}: {formatNumber(currentWeight, 1)} {tr('кг', 'kg')}
            </Txt>
            {profile.targetWeightKg != null && (
              <Txt v="small" tone="textMuted">
                {tr('Цел', 'Goal')}: {formatNumber(profile.targetWeightKg, 1)} {tr('кг', 'kg')}
              </Txt>
            )}
            <Txt v="small" tone="textMuted">
              {tr('Норма', 'Healthy range')}: {Math.round(healthyMin)}–{Math.round(healthyMax)} {tr('кг', 'kg')}
            </Txt>
            {weights.length > 1 && (
              <Txt v="smallStrong" tone={change <= 0 ? 'success' : 'warning'} style={{ marginTop: 4 }}>
                {change <= 0 ? '▼' : '▲'} {formatNumber(Math.abs(change), 1)} {tr('кг от началото', 'kg since the start')}
              </Txt>
            )}
            {toGoal != null && toGoal > 0 && (
              <Txt v="small" tone="textMuted">
                {tr('Остават {kg} кг', '{kg} kg to go', { kg: formatNumber(toGoal, 1) })}
              </Txt>
            )}
            {toGoal != null && toGoal <= 0 && (
              <Txt v="smallStrong" tone="success">
                {tr('Целта е постигната! 🎉', 'Goal reached! 🎉')}
              </Txt>
            )}
          </View>
        </Row>
      </Card>

      <SectionHeader title={tr('Запиши днешното тегло', 'Log today’s weight')} />
      <Row gap={10} style={{ marginBottom: 16 }}>
        <Input value={weightDraft} onChangeText={setWeightDraft} keyboardType="numeric" placeholder={`${currentWeight} ${tr('кг', 'kg')}`} style={{ flex: 1 }} big />
        <IconButton onPress={saveWeight} size={56} tint={t.c.accent} accessibilityLabel={tr('Запази теглото', 'Save weight')}>
          <CheckIcon size={26} color={t.c.onAccent} />
        </IconButton>
      </Row>

      <SectionHeader title={tr('Графика на теглото', 'Weight chart')} />
      <Card>
        {weights.length > 0 ? (
          <LineChart
            key={`w-${weights.length}-${isPro}`}
            data={weights.slice(-30).map((w) => ({ label: shortDate(w.date), value: w.weightKg }))}
            color={t.c.info}
            unit={tr('кг', 'kg')}
            target={profile.targetWeightKg}
            overlay={isPro && weights.length > 1 ? trend.slice(-30).map((p) => p.trendKg) : undefined}
          />
        ) : (
          <Txt tone="textMuted" center style={{ paddingVertical: 24 }}>
            {tr('Записвай теглото си, за да виждаш графиката.', 'Log your weight to see the chart.')}
          </Txt>
        )}
      </Card>

      <SectionHeader title={tr('Тренд и прогноза', 'Trend and forecast')} />
      {isPro ? (
        <TrendCard points={trend} targetKg={profile.targetWeightKg} />
      ) : (
        <ProLock
          emoji="📉"
          title={tr('Тренд и прогноза', 'Trend and forecast')}
          text={tr('Изгладено тегло без дневните скокове, темп в кг на седмица и кога ще стигнеш целевото тегло.', 'Your weight without the daily swings, your pace in kg a week and when you’ll reach your goal weight.')}
        />
      )}

      <SectionHeader
        title={tr('Обиколки и % мазнини', 'Measurements and body fat')}
        action={isPro && measurements.length > 0 ? tr('Всички', 'All') : undefined}
        onAction={() => router.push('/measurements')}
      />
      {isPro ? (
        <MeasurementsCard rows={measurements} profile={profile} />
      ) : (
        <ProLock emoji="📏" title={tr('Обиколки и % мазнини', 'Measurements and body fat')} text={measurementsTeaser()} />
      )}

      <SectionHeader
        title={tr('Снимки за прогрес', 'Progress photos')}
        action={isPro && photos.length > 0 ? tr('Всички', 'All') : undefined}
        onAction={() => router.push('/progress-photos')}
      />
      {isPro ? (
        <PhotosCard photos={photos} />
      ) : (
        <ProLock emoji="📸" title={tr('Снимки за прогрес', 'Progress photos')} text={tr('Снимай се по време на режима и виж как се променя тялото ти.', 'Take photos during your diet and see how your body changes.')} />
      )}

      {weights.length > 0 && (
        <>
          <SectionHeader title={tr('Последни измервания', 'Recent measurements')} />
          <Card>
            {weights
              .slice(-8)
              .reverse()
              .map((w, i, arr) => {
                const prev = arr[i + 1];
                const diff = prev ? w.weightKg - prev.weightKg : 0;
                return (
                  <Row key={w.date} style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: t.c.border }}>
                    <Txt style={{ flex: 1 }}>{formatDateLabel(w.date)}</Txt>
                    {prev ? (
                      <Txt v="small" tone={diff <= 0 ? 'success' : 'warning'} style={{ marginRight: 12 }}>
                        {diff <= 0 ? '−' : '+'}
                        {formatNumber(Math.abs(diff), 1)}
                      </Txt>
                    ) : null}
                    <Txt v="bodyStrong" style={{ marginRight: 12 }}>
                      {formatNumber(w.weightKg, 1)} {tr('кг', 'kg')}
                    </Txt>
                    <Pressable onPress={() => removeWeight(w)} hitSlop={10}>
                      <TrashIcon size={20} color={t.c.textFaint} />
                    </Pressable>
                  </Row>
                );
              })}
          </Card>
        </>
      )}

      <Button label={tr('Преизчисли целите по текущото тегло', 'Recalculate goals for current weight')} variant="secondary" onPress={recalcGoals} style={{ marginTop: 6 }} />
    </Screen>
  );
}

/** Smoothed weight, weekly pace and when the goal is reached at that pace (Pro). */
function TrendCard({ points, targetKg }: { points: TrendPoint[]; targetKg: number | null }) {
  const { tr } = useI18n();
  const f = forecastWeight(points, targetKg, todayKey());
  if (f.trendKg == null) {
    return (
      <Card>
        <Txt tone="textMuted">{tr('Записвай теглото си, за да виждаш тренда.', 'Log your weight to see the trend.')}</Txt>
      </Card>
    );
  }
  const pace =
    f.perWeek == null
      ? '—'
      : tr('{kg} кг/седм.', '{kg} kg/wk', { kg: `${f.perWeek > 0 ? '+' : f.perWeek < 0 ? '−' : ''}${formatNumber(Math.abs(f.perWeek), Math.abs(f.perWeek) < 1 ? 2 : 1)}` });
  const goal = f.goalDate ? dateOf(f.goalDate) : null;
  const message =
    f.status === 'onTrack' && goal && targetKg != null
      ? tr('При този темп ще стигнеш {kg} кг около {date} — след {n} {n|седмица|седмици}.', 'At this pace you’ll reach {kg} kg around {date} — in {n} {n|week|weeks}.', {
          kg: formatNumber(targetKg, 1),
          date: formatDayMonth(goal, goal.getFullYear() !== new Date().getFullYear()),
          n: f.weeksToGoal ?? 1,
        })
      : f.status === 'noPace'
        ? tr('Претегляй се поне седмица, за да видиш темпа и прогнозата.', 'Weigh yourself for at least a week to see your pace and the forecast.')
        : f.status === 'noTarget'
          ? tr('Задай целево тегло в профила, за да видиш кога ще го стигнеш.', 'Set a target weight in your profile to see when you’ll reach it.')
          : f.status === 'reached'
            ? tr('Ти си на целта! 🎉', 'You’re at your goal! 🎉')
            : f.status === 'steady'
              ? tr('Теглото ти стои на едно място — целта не се приближава.', 'Your weight is holding steady — the goal isn’t getting closer.')
              : f.status === 'away'
                ? tr('Трендът върви в обратна посока на целта.', 'The trend is moving away from your goal.')
                : tr('При този темп целта е след повече от 3 години.', 'At this pace your goal is more than 3 years away.');
  const tone = f.status === 'onTrack' || f.status === 'reached' ? 'success' : f.status === 'away' ? 'warning' : 'textMuted';

  return (
    <Card style={{ gap: 10 }}>
      <Row gap={12}>
        <View style={{ flex: 1 }}>
          <Txt v="caption" tone="textMuted">
            {tr('Тренд', 'Trend')}
          </Txt>
          <Txt v="h2">
            {formatNumber(f.trendKg, 1)} {tr('кг', 'kg')}
          </Txt>
        </View>
        <View style={{ flex: 1 }}>
          <Txt v="caption" tone="textMuted">
            {tr('Темп', 'Pace')}
          </Txt>
          <Txt v="h2">{pace}</Txt>
        </View>
      </Row>
      <Txt v="bodyStrong" tone={tone}>
        {message}
      </Txt>
      {f.tooFast && (
        <Txt v="small" tone="warning">
          {tr('Губиш над 1% от теглото си на седмица. По-бавното отслабване се задържа по-лесно.', 'You’re losing more than 1% of your weight a week. Weight lost more slowly is easier to keep off.')}
        </Txt>
      )}
      <Txt v="caption" tone="textMuted">
        {tr('Трендът е изгладеното тегло — без дневните скокове от вода и храна. На графиката е с пунктир.', 'The trend is your smoothed weight — without the daily swings from water and food. It is the dashed line on the chart.')}
      </Txt>
    </Card>
  );
}

/** The latest tape measurements with the change since the first ones, and body fat % (Pro). */
function MeasurementsCard({ rows, profile }: { rows: BodyMeasurement[]; profile: UserProfile }) {
  const t = useTheme();
  const { tr } = useI18n();
  const items = MEASURE_KEYS.flatMap((k) => {
    const withK = rows.filter((r) => r.values[k] != null);
    if (withK.length === 0) return [];
    const first = withK[0].values[k]!;
    const last = withK[withK.length - 1].values[k]!;
    return [{ k, last, change: withK.length > 1 ? last - first : 0 }];
  });
  const fat = [...rows].reverse().map((r) => navyBodyFat(profile.sex, profile.heightCm, r.values)).find((v) => v != null) ?? null;
  const category = fat != null ? bodyFatCategory(profile.sex, fat) : null;

  return (
    <Card style={{ gap: 12 }}>
      {items.length === 0 ? (
        <Txt tone="textMuted">
          {tr(
            'Мери талията, ханша и другите обиколки веднъж седмично — сантиметрите често падат, когато кантарът стои.',
            'Measure your waist, hips and the rest once a week — centimetres often drop while the scale stands still.'
          )}
        </Txt>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 12 }}>
          {items.map(({ k, last, change }) => (
            <View key={k} style={{ width: '33.3%' }}>
              <Txt v="caption" tone="textMuted">
                {measureLabel(k)}
              </Txt>
              <Txt v="bodyStrong">
                {formatNumber(last, 1)} {tr('см', 'cm')}
              </Txt>
              {change !== 0 && (
                <Txt v="caption" tone="textMuted">
                  {change < 0 ? '▼' : '▲'} {formatNumber(Math.abs(change), 1)}
                </Txt>
              )}
            </View>
          ))}
        </View>
      )}
      {fat != null && category && (
        <Row gap={8}>
          <Txt v="small" tone="textMuted">
            {tr('% телесни мазнини', 'Body fat %')}:
          </Txt>
          <Txt v="bodyStrong">{formatNumber(fat, 1)} %</Txt>
          <Txt v="small" color={{ info: t.c.info, success: t.c.success, warning: t.c.warning, danger: t.c.danger }[category.tone]}>
            {category.label}
          </Txt>
        </Row>
      )}
      <Button label={tr('Измери', 'Measure')} variant={items.length ? 'secondary' : 'primary'} onPress={() => router.push('/measurements')} />
    </Card>
  );
}

/** The latest photo of each pose, and the way to take more or compare. */
function PhotosCard({ photos }: { photos: ProgressPhoto[] }) {
  const t = useTheme();
  const { tr } = useI18n();
  const latest = POSES.map((pose) => [...photos].reverse().find((p) => p.pose === pose)).filter((p): p is ProgressPhoto => p != null);
  return (
    <Card style={{ gap: 12 }}>
      {latest.length > 0 ? (
        <Pressable onPress={() => router.push('/progress-photos')}>
          <Row gap={8}>
            {latest.map((p) => (
              <View key={p.id} style={[styles.thumb, { backgroundColor: t.c.surfaceAlt }]}>
                <Image source={{ uri: photoUri(p.file) }} style={StyleSheet.absoluteFill} resizeMode="cover" resizeMethod="resize" />
                <View style={styles.thumbLabel}>
                  <Txt v="caption" color="#FFFFFF" numberOfLines={1}>
                    {poseLabel(p.pose)} · {formatDateLabel(p.date)}
                  </Txt>
                </View>
              </View>
            ))}
          </Row>
        </Pressable>
      ) : (
        <Txt tone="textMuted">
          {tr(
            'Снимай се отпред, отстрани и отзад в началото на режима и после веднъж седмично. Снимките остават само на телефона.',
            'Take a front, side and back photo when you start your diet and then once a week. The photos stay on your phone only.'
          )}
        </Txt>
      )}
      <Row gap={10}>
        <Button label={tr('Снимай', 'Take photo')} icon={<CameraIcon size={20} color={t.c.onAccent} />} flex onPress={() => router.push('/progress-camera')} />
        {photos.length >= 2 ? <Button label={tr('Сравни', 'Compare')} variant="secondary" icon={<CompareIcon size={20} color={t.c.text} />} flex onPress={() => router.push('/progress-compare')} /> : null}
      </Row>
    </Card>
  );
}

const styles = StyleSheet.create({
  thumb: { flex: 1, aspectRatio: 3 / 4, borderRadius: 12, overflow: 'hidden', maxWidth: '33%' },
  thumbLabel: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingVertical: 3, paddingHorizontal: 4, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)' },
});
