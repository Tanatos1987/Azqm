import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { ScreenContainer } from '@/components/ScreenContainer';
import { MacroRing } from '@/components/MacroRing';
import { FoodEntryRow } from '@/components/FoodEntryRow';
import { ElectrolyteBar } from '@/components/ElectrolyteBar';
import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon } from '@/components/icons';
import { colors } from '@/theme/colors';
import { useSettings } from '@/context/SettingsContext';
import { useProfile } from '@/context/ProfileContext';
import { useDataRefresh } from '@/context/DataRefreshContext';
import { EMPTY_MICROS, MICRONUTRIENTS } from '@/data/micronutrients';
import { deleteFoodEntry, getAllFoodEntries, getDailyMicros, getDailyTotals, getEntriesForDate, getHydrationTotals } from '@/db/queries';
import type { FoodEntry, MacroTotals, Micronutrients } from '@/types';
import { formatDateLabel, shiftDateKey, todayKey } from '@/utils/date';
import { buildFoodEntriesCsv, exportAndShareCsv } from '@/utils/csv';

const EMPTY_TOTALS: MacroTotals = { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, netCarbs: 0 };

export default function TodayScreen() {
  const db = useSQLiteContext();
  const { goals } = useSettings();
  const { profile } = useProfile();
  const { version, bump } = useDataRefresh();
  const [date, setDate] = useState(todayKey());
  const [totals, setTotals] = useState<MacroTotals>(EMPTY_TOTALS);
  const [micros, setMicros] = useState<Micronutrients>(EMPTY_MICROS);
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [exporting, setExporting] = useState(false);
  const [showMicros, setShowMicros] = useState(false);

  const load = useCallback(async () => {
    const [t, e, m, h] = await Promise.all([
      getDailyTotals(db, date),
      getEntriesForDate(db, date),
      getDailyMicros(db, date),
      getHydrationTotals(db, date),
    ]);
    setTotals(t);
    setEntries(e);
    // Electrolyte supplements logged on the Пост tab count towards the day's intake too.
    setMicros({
      ...m,
      sodiumMg: m.sodiumMg + h.sodiumMg,
      potassiumMg: m.potassiumMg + h.potassiumMg,
      magnesiumMg: m.magnesiumMg + h.magnesiumMg,
    });
  }, [db, date]);

  useEffect(() => {
    // Refetch from SQLite whenever the date/version changes; setState happens
    // inside the awaited async call, not synchronously in the effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load, version]);

  const handleDelete = useCallback(
    (id: number) => {
      Alert.alert('Изтриване', 'Да изтрия ли този запис?', [
        { text: 'Отказ', style: 'cancel' },
        {
          text: 'Изтрий',
          style: 'destructive',
          onPress: async () => {
            await deleteFoodEntry(db, id);
            bump();
          },
        },
      ]);
    },
    [db, bump]
  );

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const all = await getAllFoodEntries(db);
      if (all.length === 0) {
        Alert.alert('Няма данни', 'Дневникът все още е празен.');
        return;
      }
      const csv = buildFoodEntriesCsv(all);
      await exportAndShareCsv(csv, `keto-dnevnik-${todayKey()}.csv`);
    } catch (err: any) {
      Alert.alert('Грешка при експорт', err?.message ?? String(err));
    } finally {
      setExporting(false);
    }
  }, [db]);

  return (
    <ScreenContainer
      title="Днес"
      subtitle="Обобщение на макронутриентите"
      headerRight={
        <Pressable onPress={handleExport} disabled={exporting} style={styles.exportBtn} hitSlop={8}>
          <DownloadIcon size={20} color={colors.text} />
        </Pressable>
      }
    >
      <FlatList
        data={entries}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <FoodEntryRow entry={item} onDelete={handleDelete} />}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={<Text style={styles.emptyText}>Все още няма записи за този ден.</Text>}
        ListHeaderComponent={
          <>
            <View style={styles.dateNav}>
              <Pressable onPress={() => setDate((d) => shiftDateKey(d, -1))} hitSlop={10} style={styles.navBtn}>
                <ChevronLeftIcon size={20} color={colors.textMuted} />
              </Pressable>
              <Text style={styles.dateLabel}>{formatDateLabel(date)}</Text>
              <Pressable onPress={() => setDate((d) => shiftDateKey(d, 1))} hitSlop={10} style={styles.navBtn}>
                <ChevronRightIcon size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <View style={styles.summaryCard}>
              <MacroRing label="Калории" value={totals.calories} goal={goals.calories} unit="" color={colors.accent} size={108} />
              <View style={styles.smallRings}>
                <MacroRing label="Протеин" value={totals.protein} goal={goals.protein} color={colors.protein} size={72} />
                <MacroRing label="Мазнини" value={totals.fat} goal={goals.fat} color={colors.fat} size={72} />
                <MacroRing label="Нетни В-ди" value={totals.netCarbs} goal={goals.netCarbs} color={colors.carbs} size={72} />
              </View>
            </View>

            <Pressable style={styles.microHeader} onPress={() => setShowMicros((s) => !s)}>
              <Text style={styles.sectionTitleInline}>Микронутриенти</Text>
              <Text style={styles.toggle}>{showMicros ? 'Скрий ▲' : 'Покажи ▼'}</Text>
            </Pressable>
            {showMicros && (
              <View style={styles.microCard}>
                {MICRONUTRIENTS.map((m) => (
                  <ElectrolyteBar
                    key={m.key}
                    label={m.label}
                    value={micros[m.key]}
                    target={m.target[profile?.sex ?? 'male']}
                    unit={m.unit}
                    color={colors.accentAlt}
                  />
                ))}
                <Text style={styles.microHint}>Броят се храните от базата и електролитите от „Пост“. Снимка/баркод/ръчно нямат данни за микронутриенти.</Text>
              </View>
            )}

            <Text style={styles.sectionTitle}>Записи</Text>
          </>
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  exportBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 16 },
  navBtn: { padding: 6 },
  dateLabel: { color: colors.text, fontSize: 16, fontWeight: '600', minWidth: 110, textAlign: 'center' },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  smallRings: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 18 },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 10 },
  sectionTitleInline: { color: colors.text, fontSize: 15, fontWeight: '700' },
  microHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  toggle: { color: colors.accent, fontSize: 12, fontWeight: '600' },
  microCard: { backgroundColor: colors.surface, borderRadius: 18, padding: 16, paddingBottom: 6, marginBottom: 20 },
  microHint: { color: colors.textMuted, fontSize: 10, lineHeight: 14, marginBottom: 10 },
  emptyText: { color: colors.textMuted, textAlign: 'center', marginTop: 24, fontSize: 13 },
});
