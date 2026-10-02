import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { colors } from '@/theme/colors';
import { useDataRefresh } from '@/context/DataRefreshContext';
import { insertFoodEntry } from '@/db/queries';
import { netCarbsOf } from '@/utils/nutrition';
import { todayKey } from '@/utils/date';
import { CheckIcon } from '../icons';

const FIELDS: { key: 'calories' | 'protein' | 'fat' | 'carbs' | 'fiber'; label: string }[] = [
  { key: 'calories', label: 'Калории' },
  { key: 'protein', label: 'Протеин (г)' },
  { key: 'fat', label: 'Мазнини (г)' },
  { key: 'carbs', label: 'Общо въглехидрати (г)' },
  { key: 'fiber', label: 'Фибри (г)' },
];

export function ManualEntryForm() {
  const db = useSQLiteContext();
  const { bump } = useDataRefresh();
  const [name, setName] = useState('');
  const [grams, setGrams] = useState('');
  const [values, setValues] = useState<Record<string, string>>({
    calories: '',
    protein: '',
    fat: '',
    carbs: '',
    fiber: '',
  });

  const setField = (key: string, v: string) => setValues((prev) => ({ ...prev, [key]: v }));

  const reset = () => {
    setName('');
    setGrams('');
    setValues({ calories: '', protein: '', fat: '', carbs: '', fiber: '' });
  };

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('Липсва име', 'Въведи име на храната.');
      return;
    }
    const num = (v: string) => Number(v.replace(',', '.')) || 0;
    const carbs = num(values.carbs);
    const fiber = num(values.fiber);
    await insertFoodEntry(db, {
      date: todayKey(),
      timeIso: new Date().toISOString(),
      name: name.trim(),
      source: 'manual',
      grams: grams ? num(grams) : null,
      calories: num(values.calories),
      protein: num(values.protein),
      fat: num(values.fat),
      carbs,
      fiber,
      netCarbs: netCarbsOf(carbs, fiber),
    });
    bump();
    Alert.alert('Добавено', `${name.trim()} е записано в дневника.`);
    reset();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Име на храната</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="напр. Пилешко бутче на скара"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Грамаж (г, по избор)</Text>
        <TextInput
          style={styles.input}
          value={grams}
          onChangeText={setGrams}
          keyboardType="numeric"
          placeholder="напр. 200"
          placeholderTextColor={colors.textMuted}
        />

        {FIELDS.map((f) => (
          <View key={f.key}>
            <Text style={styles.label}>{f.label}</Text>
            <TextInput
              style={styles.input}
              value={values[f.key]}
              onChangeText={(v) => setField(f.key, v)}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        ))}

        <Pressable style={styles.saveBtn} onPress={save}>
          <CheckIcon size={18} color={colors.bg} />
          <Text style={styles.saveBtnText}>Запази в дневника</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  form: { paddingBottom: 40, gap: 4 },
  label: { color: colors.textMuted, fontSize: 12, marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  saveBtn: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  saveBtnText: { color: colors.bg, fontWeight: '700', fontSize: 15 },
});
