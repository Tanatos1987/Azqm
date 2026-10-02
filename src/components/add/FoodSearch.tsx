import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { colors } from '@/theme/colors';
import { useDataRefresh } from '@/context/DataRefreshContext';
import { useProfile } from '@/context/ProfileContext';
import { FOOD_CATEGORY_LABELS, getFoodById, searchFoods } from '@/data/foods';
import { MICRONUTRIENTS } from '@/data/micronutrients';
import { getRecentFoodIds, insertFoodEntry } from '@/db/queries';
import { netCarbsOf, scaleMicros, scalePer100g } from '@/utils/nutrition';
import { todayKey } from '@/utils/date';
import type { FoodCategory, FoodItem } from '@/types';
import { CheckIcon, SearchIcon } from '../icons';

const CATEGORIES = Object.keys(FOOD_CATEGORY_LABELS) as FoodCategory[];
const QUICK_GRAMS = [50, 100, 150, 200];

export function FoodSearch() {
  const db = useSQLiteContext();
  const { version } = useDataRefresh();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<FoodCategory | null>(null);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [selected, setSelected] = useState<FoodItem | null>(null);

  useEffect(() => {
    // Recents are refetched after every save (version bump).
    getRecentFoodIds(db, 8).then(setRecentIds);
  }, [db, version]);

  const results = useMemo(() => searchFoods(query, category), [query, category]);
  const recents = useMemo(
    () => (query || category ? [] : recentIds.map(getFoodById).filter((f): f is FoodItem => !!f)),
    [query, category, recentIds]
  );

  if (selected) {
    return <FoodDetail food={selected} onDone={() => setSelected(null)} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.searchBox}>
        <SearchIcon size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Търси храна, напр. сирене, яйце, сьомга"
          placeholderTextColor={colors.textMuted}
          autoCorrect={false}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips} contentContainerStyle={{ gap: 8 }}>
        <Chip label="Всички" active={category === null} onPress={() => setCategory(null)} />
        {CATEGORIES.map((c) => (
          <Chip key={c} label={FOOD_CATEGORY_LABELS[c]} active={category === c} onPress={() => setCategory(category === c ? null : c)} />
        ))}
      </ScrollView>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 24 }}
        ListHeaderComponent={
          recents.length > 0 ? (
            <View style={{ marginBottom: 8 }}>
              <Text style={styles.sectionTitle}>Последно използвани</Text>
              {recents.map((f) => (
                <FoodRow key={f.id} food={f} onPress={() => setSelected(f)} />
              ))}
              <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Всички храни</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => <FoodRow food={item} onPress={() => setSelected(item)} />}
        ListEmptyComponent={<Text style={styles.emptyText}>Няма намерени храни. Опитай с друга дума или използвай „Ръчно“.</Text>}
      />
    </View>
  );
}

function FoodRow({ food, onPress }: { food: FoodItem; onPress: () => void }) {
  const p = food.per100g;
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowName} numberOfLines={1}>
          {food.name}
        </Text>
        <Text style={styles.rowMeta}>
          100 г · {Math.round(p.calories)} ккал · Б {Math.round(p.protein)} · М {Math.round(p.fat)} · НВ {Math.round(netCarbsOf(p.carbs, p.fiber))}
        </Text>
      </View>
      <Text style={styles.rowPlus}>+</Text>
    </Pressable>
  );
}

function FoodDetail({ food, onDone }: { food: FoodItem; onDone: () => void }) {
  const db = useSQLiteContext();
  const { bump } = useDataRefresh();
  const { profile } = useProfile();
  const [grams, setGrams] = useState(String(food.portion?.grams ?? 100));

  const gramsNum = Number(grams.replace(',', '.')) || 0;
  const scaled = scalePer100g(food.per100g, gramsNum);
  const micros = scaleMicros(food.micros, gramsNum);
  const netCarbs = netCarbsOf(scaled.carbs, scaled.fiber);
  const sex = profile?.sex ?? 'male';

  const save = useCallback(async () => {
    if (gramsNum <= 0) {
      Alert.alert('Невалиден грамаж', 'Въведи грамажа на порцията.');
      return;
    }
    await insertFoodEntry(db, {
      date: todayKey(),
      timeIso: new Date().toISOString(),
      name: food.name,
      source: 'database',
      grams: gramsNum,
      ...scaled,
      netCarbs,
      micros,
      foodId: food.id,
    });
    bump();
    Alert.alert('Добавено', `${food.name} (${Math.round(gramsNum)} г) е записано в дневника.`);
    onDone();
  }, [db, bump, food, gramsNum, scaled, netCarbs, micros, onDone]);

  const quick = food.portion ? [{ label: `${food.portion.label} (${food.portion.grams} г)`, grams: food.portion.grams }] : [];

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <View style={styles.detailCard}>
        <Text style={styles.detailTitle}>{food.name}</Text>
        <Text style={styles.detailCategory}>{FOOD_CATEGORY_LABELS[food.category]}</Text>

        <View style={styles.gramsRow}>
          <Text style={styles.gramsLabel}>Количество:</Text>
          <TextInput style={styles.gramsInput} keyboardType="numeric" value={grams} onChangeText={setGrams} selectTextOnFocus />
          <Text style={styles.gramsLabel}>г</Text>
        </View>
        <View style={styles.quickRow}>
          {[...quick, ...QUICK_GRAMS.map((g) => ({ label: `${g} г`, grams: g }))].map((q) => (
            <Chip key={q.label} label={q.label} active={gramsNum === q.grams} onPress={() => setGrams(String(q.grams))} />
          ))}
        </View>

        <View style={styles.macroGrid}>
          <MacroStat label="Ккал" value={scaled.calories} color={colors.accent} />
          <MacroStat label="Протеин" value={scaled.protein} unit="г" color={colors.protein} />
          <MacroStat label="Мазнини" value={scaled.fat} unit="г" color={colors.fat} />
          <MacroStat label="Нетни В-ди" value={netCarbs} unit="г" color={colors.carbs} />
        </View>

        <Text style={styles.microTitle}>Микронутриенти (% от дневната нужда)</Text>
        {MICRONUTRIENTS.map((m) => {
          const value = micros[m.key] ?? 0;
          const pct = Math.round((value / m.target[sex]) * 100);
          return (
            <View key={m.key} style={styles.microRow}>
              <Text style={styles.microLabel}>{m.label}</Text>
              <View style={styles.microTrack}>
                <View style={[styles.microFill, { width: `${Math.min(pct, 100)}%` }]} />
              </View>
              <Text style={styles.microValue}>
                {value < 10 ? value.toFixed(1) : Math.round(value)} {m.unit} · {pct}%
              </Text>
            </View>
          );
        })}
        <Text style={styles.hint}>Стойностите са ориентировъчни средни (USDA); реалните варират по рецепта и марка.</Text>

        <View style={styles.actionsRow}>
          <Pressable style={styles.secondaryBtn} onPress={onDone}>
            <Text style={styles.secondaryBtnText}>Назад</Text>
          </Pressable>
          <Pressable style={styles.primaryBtn} onPress={save}>
            <CheckIcon size={18} color={colors.bg} />
            <Text style={styles.primaryBtnText}>Запази</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function MacroStat({ label, value, unit = '', color }: { label: string; value: number; unit?: string; color: string }) {
  return (
    <View style={styles.macroStat}>
      <Text style={[styles.macroValue, { color }]}>
        {Math.round(value)}
        {unit}
      </Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, color: colors.text, paddingVertical: 12, fontSize: 14 },
  chips: { flexGrow: 0, marginVertical: 12 },
  chip: { backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16 },
  chipActive: { backgroundColor: colors.accent },
  chipText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: colors.bg },
  sectionTitle: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  rowName: { color: colors.text, fontWeight: '600', fontSize: 14 },
  rowMeta: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  rowPlus: { color: colors.accent, fontSize: 22, fontWeight: '600', marginLeft: 8 },
  emptyText: { color: colors.textMuted, textAlign: 'center', marginTop: 24, fontSize: 13 },
  detailCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 18 },
  detailTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  detailCategory: { color: colors.textMuted, fontSize: 12, marginTop: 2, marginBottom: 14 },
  gramsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gramsLabel: { color: colors.textMuted, fontSize: 14 },
  gramsInput: {
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    width: 90,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
  },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, marginBottom: 18 },
  macroGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  macroStat: { alignItems: 'center', flex: 1 },
  macroValue: { fontSize: 20, fontWeight: '700' },
  macroLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  microTitle: { color: colors.text, fontSize: 13, fontWeight: '700', marginBottom: 10 },
  microRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  microLabel: { color: colors.text, fontSize: 12, width: 82 },
  microTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  microFill: { height: '100%', borderRadius: 3, backgroundColor: colors.accentAlt },
  microValue: { color: colors.textMuted, fontSize: 11, width: 92, textAlign: 'right' },
  hint: { color: colors.textMuted, fontSize: 11, marginTop: 8, lineHeight: 15 },
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 18 },
  primaryBtn: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: colors.accent,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  primaryBtnText: { color: colors.bg, fontWeight: '700', fontSize: 14 },
  secondaryBtn: {
    backgroundColor: colors.surfaceAlt,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  secondaryBtnText: { color: colors.text, fontWeight: '600', fontSize: 14 },
});
