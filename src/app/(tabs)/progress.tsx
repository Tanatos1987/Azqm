import React, { useCallback, useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/ScreenContainer';
import { BodyFigure } from '@/components/BodyFigure';
import { LineChart } from '@/components/charts/LineChart';
import { BarChart } from '@/components/charts/BarChart';
import { CheckIcon, UserIcon } from '@/components/icons';
import { colors } from '@/theme/colors';
import { useProfile } from '@/context/ProfileContext';
import { useSettings } from '@/context/SettingsContext';
import { useDataRefresh } from '@/context/DataRefreshContext';
import { getDailyCaloriesRange, getWeightEntries } from '@/db/queries';
import { bmiCategory, bmiOf, healthyWeightRange } from '@/utils/bodyMetrics';
import { shiftDateKey, todayKey } from '@/utils/date';
import type { DailyCalories, WeightEntry } from '@/types';

const WEEKDAYS = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

function shortDate(dateKey: string): string {
  const [, m, d] = dateKey.split('-');
  return `${Number(d)}.${m}`;
}

function weekday(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return WEEKDAYS[new Date(y, m - 1, d).getDay()];
}

export default function ProgressScreen() {
  const db = useSQLiteContext();
  const { profile, updateWeight, saveProfile } = useProfile();
  const { goals } = useSettings();
  const { version } = useDataRefresh();
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [week, setWeek] = useState<DailyCalories[]>([]);
  const [weightDraft, setWeightDraft] = useState('');

  const load = useCallback(async () => {
    const today = todayKey();
    const from = shiftDateKey(today, -6);
    const [w, days] = await Promise.all([getWeightEntries(db), getDailyCaloriesRange(db, from, today)]);
    const byDate = new Map(days.map((d) => [d.date, d]));
    setWeights(w);
    setWeek(
      Array.from({ length: 7 }, (_, i) => {
        const date = shiftDateKey(from, i);
        return byDate.get(date) ?? { date, calories: 0, netCarbs: 0 };
      })
    );
  }, [db]);

  useEffect(() => {
    // Refetch whenever data changes; setState happens after the awaited queries.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load, version]);

  if (!profile) return null;

  const currentWeight = weights.length > 0 ? weights[weights.length - 1].weightKg : profile.weightKg;
  const startWeight = weights.length > 0 ? weights[0].weightKg : profile.weightKg;
  const bmi = bmiOf(currentWeight, profile.heightCm);
  const category = bmiCategory(bmi);
  const [healthyMin, healthyMax] = healthyWeightRange(profile.heightCm);
  const change = currentWeight - startWeight;
  const toGoal = profile.targetWeightKg != null ? currentWeight - profile.targetWeightKg : null;

  const loggedDays = week.filter((d) => d.calories > 0);
  const avgCalories = loggedDays.length > 0 ? loggedDays.reduce((s, d) => s + d.calories, 0) / loggedDays.length : 0;
  const ketoDays = loggedDays.filter((d) => d.netCarbs <= goals.netCarbs).length;

  const saveWeight = async () => {
    const kg = Number(weightDraft.replace(',', '.'));
    if (!(kg >= 30 && kg <= 300)) {
      Alert.alert('Тегло', 'Въведи тегло в килограми (30–300).');
      return;
    }
    await updateWeight(kg);
    setWeightDraft('');
  };

  const recalcGoals = () => {
    Alert.alert('Преизчисляване', `Да изчисля ли наново дневните цели с текущото тегло ${currentWeight} кг? Ръчно зададените цели ще бъдат заменени.`, [
      { text: 'Отказ', style: 'cancel' },
      { text: 'Преизчисли', onPress: () => saveProfile({ ...profile, weightKg: currentWeight }) },
    ]);
  };

  return (
    <ScreenContainer
      title="Прогрес"
      subtitle="Тегло, BMI и седмичен прием"
      headerRight={
        <Pressable onPress={() => router.push('/profile')} style={styles.headerBtn} hitSlop={8}>
          <UserIcon size={20} color={colors.text} />
        </Pressable>
      }
    >
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View style={styles.bodyCard}>
            <BodyFigure bmi={bmi} sex={profile.sex} size={200} fromBmi={22} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.bmiValue}>BMI {bmi.toFixed(1)}</Text>
              <Text style={[styles.bmiCategory, { color: category.color }]}>{category.label}</Text>
              <Text style={styles.meta}>Сега: {currentWeight} кг</Text>
              {profile.targetWeightKg != null && <Text style={styles.meta}>Цел: {profile.targetWeightKg} кг</Text>}
              <Text style={styles.meta}>
                Норма: {Math.round(healthyMin)}–{Math.round(healthyMax)} кг
              </Text>
              {weights.length > 1 && (
                <Text style={[styles.change, { color: change <= 0 ? colors.success : colors.warning }]}>
                  {change <= 0 ? '▼' : '▲'} {Math.abs(change).toFixed(1)} кг от началото
                </Text>
              )}
              {toGoal != null && toGoal > 0 && <Text style={styles.meta}>Остават {toGoal.toFixed(1)} кг до целта</Text>}
              {toGoal != null && toGoal <= 0 && <Text style={[styles.change, { color: colors.success }]}>Целта е постигната! 🎉</Text>}
            </View>
          </View>

          <Text style={styles.sectionTitle}>Запиши днешното тегло</Text>
          <View style={styles.weightRow}>
            <TextInput
              style={styles.weightInput}
              value={weightDraft}
              onChangeText={setWeightDraft}
              keyboardType="numeric"
              placeholder={`${currentWeight}`}
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.meta}>кг</Text>
            <Pressable style={styles.smallBtn} onPress={saveWeight}>
              <CheckIcon size={18} color={colors.bg} />
            </Pressable>
          </View>

          <Text style={styles.sectionTitle}>Тегло</Text>
          <View style={styles.card}>
            {weights.length > 0 ? (
              <LineChart
                key={`w-${weights.length}`}
                data={weights.slice(-30).map((w) => ({ label: shortDate(w.date), value: w.weightKg }))}
                color={colors.accentAlt}
                unit="кг"
                target={profile.targetWeightKg}
              />
            ) : (
              <Text style={styles.emptyText}>Записвай теглото си, за да виждаш графиката.</Text>
            )}
          </View>

          <Text style={styles.sectionTitle}>Калории за последните 7 дни</Text>
          <View style={styles.card}>
            <BarChart
              data={week.map((d) => ({ label: weekday(d.date), value: d.calories }))}
              color={colors.accent}
              goal={goals.calories}
            />
            <View style={styles.weekStats}>
              <WeekStat label="Средно на ден" value={`${Math.round(avgCalories)} ккал`} />
              <WeekStat label="Кето дни" value={`${ketoDays} / ${loggedDays.length}`} />
              <WeekStat label="Цел" value={`${goals.calories} ккал`} />
            </View>
            <Text style={styles.legend}>Пунктир = дневна цел · оранжево = над целта · кето ден = нетни въглехидрати ≤ {goals.netCarbs} г</Text>
          </View>

          <Pressable style={styles.secondaryBtn} onPress={recalcGoals}>
            <Text style={styles.secondaryBtnText}>Преизчисли целите по текущото тегло</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function WeekStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={styles.weekValue}>{value}</Text>
      <Text style={styles.weekLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 14,
    marginBottom: 20,
  },
  bmiValue: { color: colors.text, fontSize: 24, fontWeight: '800' },
  bmiCategory: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  meta: { color: colors.textMuted, fontSize: 12 },
  change: { fontSize: 13, fontWeight: '700', marginTop: 4 },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 10 },
  weightRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  weightInput: {
    flex: 1,
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
  },
  smallBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: 18, padding: 14, marginBottom: 20 },
  emptyText: { color: colors.textMuted, textAlign: 'center', paddingVertical: 24, fontSize: 13 },
  weekStats: { flexDirection: 'row', marginTop: 12 },
  weekValue: { color: colors.text, fontSize: 14, fontWeight: '700' },
  weekLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  legend: { color: colors.textMuted, fontSize: 10, marginTop: 10, lineHeight: 14 },
  secondaryBtn: { backgroundColor: colors.surfaceAlt, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  secondaryBtnText: { color: colors.text, fontWeight: '600', fontSize: 13 },
});
