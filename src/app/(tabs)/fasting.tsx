import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ProgressRing } from '@/components/ProgressRing';
import { ElectrolyteBar } from '@/components/ElectrolyteBar';
import { BoltIcon, DropletIcon } from '@/components/icons';
import { colors } from '@/theme/colors';
import { useSettings } from '@/context/SettingsContext';
import { useDataRefresh } from '@/context/DataRefreshContext';
import { formatDuration, useFastingTimer } from '@/hooks/useFastingTimer';
import { getHydrationTotals, insertHydrationEntry } from '@/db/queries';
import { ELECTROLYTE_TARGETS, electrolyteWarnings } from '@/utils/electrolytes';
import type { HydrationTotals } from '@/types';
import { todayKey } from '@/utils/date';

const EMPTY: HydrationTotals = { waterMl: 0, sodiumMg: 0, potassiumMg: 0, magnesiumMg: 0 };

const QUICK_ADDS: { key: keyof HydrationTotals; label: string; amount: number; color: string }[] = [
  { key: 'waterMl', label: '+250 мл вода', amount: 250, color: colors.water },
  { key: 'sodiumMg', label: '+500 мг натрий', amount: 500, color: colors.protein },
  { key: 'potassiumMg', label: '+300 мг калий', amount: 300, color: colors.accent },
  { key: 'magnesiumMg', label: '+100 мг магнезий', amount: 100, color: colors.fat },
];

const GOAL_OPTIONS = [16, 20, 23, 24];

export default function FastingScreen() {
  const db = useSQLiteContext();
  const { fastingGoalHours, setFastingGoalHours } = useSettings();
  const { version, bump } = useDataRefresh();
  const timer = useFastingTimer(fastingGoalHours);
  const [totals, setTotals] = useState<HydrationTotals>(EMPTY);

  const load = useCallback(async () => {
    const t = await getHydrationTotals(db, todayKey());
    setTotals(t);
  }, [db]);

  useEffect(() => {
    // Refetch from SQLite whenever the date/version changes; setState happens
    // inside the awaited async call, not synchronously in the effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load, version]);

  const quickAdd = async (key: keyof HydrationTotals, amount: number) => {
    await insertHydrationEntry(db, {
      date: todayKey(),
      timeIso: new Date().toISOString(),
      waterMl: key === 'waterMl' ? amount : 0,
      sodiumMg: key === 'sodiumMg' ? amount : 0,
      potassiumMg: key === 'potassiumMg' ? amount : 0,
      magnesiumMg: key === 'magnesiumMg' ? amount : 0,
    });
    bump();
  };

  const warnings = electrolyteWarnings(totals);

  const toggleFast = () => {
    if (timer.isFasting) {
      Alert.alert('Прекрати поста?', 'Това ще нулира текущия таймер.', [
        { text: 'Отказ', style: 'cancel' },
        { text: 'Прекрати', style: 'destructive', onPress: () => timer.stop() },
      ]);
    } else {
      timer.start();
    }
  };

  return (
    <ScreenContainer title="Пост" subtitle={`Цел: ${fastingGoalHours}:${24 - fastingGoalHours} прозорец`}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.timerCard}>
          <ProgressRing
            size={200}
            strokeWidth={14}
            progress={timer.progress}
            color={timer.isGoalReached ? colors.success : colors.accent}
          >
            <Text style={styles.timerValue}>{formatDuration(timer.elapsedMs)}</Text>
            <Text style={styles.timerSub}>
              {timer.isFasting ? (timer.isGoalReached ? 'Цел достигната!' : 'в пост') : 'без активен пост'}
            </Text>
          </ProgressRing>
          <Pressable style={[styles.toggleBtn, timer.isFasting && styles.toggleBtnStop]} onPress={toggleFast}>
            <Text style={styles.toggleBtnText}>{timer.isFasting ? 'Прекрати поста' : 'Започни пост'}</Text>
          </Pressable>
          <View style={styles.goalRow}>
            {GOAL_OPTIONS.map((h) => (
              <Pressable
                key={h}
                onPress={() => setFastingGoalHours(h)}
                style={[styles.goalChip, fastingGoalHours === h && styles.goalChipActive]}
              >
                <Text style={[styles.goalChipText, fastingGoalHours === h && styles.goalChipTextActive]}>{h}ч</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Вода и електролити</Text>
        <View style={styles.card}>
          <ElectrolyteBar label="Вода" value={totals.waterMl} target={ELECTROLYTE_TARGETS.waterMl} unit="мл" color={colors.water} />
          <ElectrolyteBar
            label="Натрий"
            value={totals.sodiumMg}
            target={ELECTROLYTE_TARGETS.sodiumMg}
            unit="мг"
            color={colors.protein}
          />
          <ElectrolyteBar
            label="Калий"
            value={totals.potassiumMg}
            target={ELECTROLYTE_TARGETS.potassiumMg}
            unit="мг"
            color={colors.accent}
          />
          <ElectrolyteBar
            label="Магнезий"
            value={totals.magnesiumMg}
            target={ELECTROLYTE_TARGETS.magnesiumMg}
            unit="мг"
            color={colors.fat}
          />

          {warnings.length > 0 && (
            <View style={styles.warningsBox}>
              {warnings.map((w) => (
                <View key={w.key} style={styles.warningRow}>
                  <BoltIcon size={14} color={colors.warning} />
                  <Text style={styles.warningText}>{w.message}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.quickAddGrid}>
            {QUICK_ADDS.map((q) => (
              <Pressable key={q.key} style={styles.quickAddBtn} onPress={() => quickAdd(q.key, q.amount)}>
                <DropletIcon size={16} color={q.color} />
                <Text style={styles.quickAddText}>{q.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  timerCard: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 20, paddingVertical: 24, marginBottom: 20 },
  timerValue: { color: colors.text, fontSize: 22, fontWeight: '700' },
  timerSub: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  toggleBtn: { backgroundColor: colors.accent, paddingVertical: 12, paddingHorizontal: 28, borderRadius: 14, marginTop: 20 },
  toggleBtnStop: { backgroundColor: colors.danger },
  toggleBtnText: { color: colors.bg, fontWeight: '700', fontSize: 14 },
  goalRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  goalChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, backgroundColor: colors.surfaceAlt },
  goalChipActive: { backgroundColor: colors.accentAlt },
  goalChipText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  goalChipTextActive: { color: colors.bg },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 10 },
  card: { backgroundColor: colors.surface, borderRadius: 20, padding: 16 },
  warningsBox: { marginTop: 4, marginBottom: 8, gap: 6 },
  warningRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  warningText: { color: colors.warning, fontSize: 12, flex: 1 },
  quickAddGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  quickAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceAlt,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    width: '47%',
  },
  quickAddText: { color: colors.text, fontSize: 11, fontWeight: '600', flexShrink: 1 },
});
