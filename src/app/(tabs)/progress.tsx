import React, { useCallback, useEffect, useState } from 'react';
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
import { deleteWeightEntry, getProgressPhotos, getWeightEntries } from '@/db/queries';
import { useTheme } from '@/theme/ThemeContext';
import { bmiCategory, bmiOf, healthyWeightRange } from '@/utils/bodyMetrics';
import { formatDateLabel, formatNumber, shortDate } from '@/utils/date';
import { POSES, photoUri, poseLabel } from '@/utils/progressPhotos';
import type { ProgressPhoto, WeightEntry } from '@/types';
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
  const [weightDraft, setWeightDraft] = useState('');

  const load = useCallback(async () => {
    const [w, p] = await Promise.all([getWeightEntries(db), getProgressPhotos(db)]);
    setWeights(w);
    setPhotos(p);
  }, [db]);

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
          <LineChart key={`w-${weights.length}`} data={weights.slice(-30).map((w) => ({ label: shortDate(w.date), value: w.weightKg }))} color={t.c.info} unit={tr('кг', 'kg')} target={profile.targetWeightKg} />
        ) : (
          <Txt tone="textMuted" center style={{ paddingVertical: 24 }}>
            {tr('Записвай теглото си, за да виждаш графиката.', 'Log your weight to see the chart.')}
          </Txt>
        )}
      </Card>

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
