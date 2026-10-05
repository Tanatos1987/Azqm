import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Button, Card, Chip, Input, Row, Txt } from '@/components/ui';
import { CheckIcon } from '@/components/icons';
import { useLogFood } from '@/hooks/useLogFood';
import { saveCustomFood } from '@/db/queries';
import { useDataRefresh } from '@/context/DataRefreshContext';
import { makeStyles, useTheme } from '@/theme/ThemeContext';
import type { MealType } from '@/types';
import { MEALS, mealForNow } from '@/utils/date';

const FIELDS = [
  { key: 'kcal', label: 'Калории (ккал)' },
  { key: 'protein', label: 'Протеин (г)' },
  { key: 'fat', label: 'Мазнини (г)' },
  { key: 'carbs', label: 'Въглехидрати общо (г)' },
  { key: 'fiber', label: 'Фибри (г)' },
] as const;

type FieldKey = (typeof FIELDS)[number]['key'];
const EMPTY: Record<FieldKey, string> = { kcal: '', protein: '', fat: '', carbs: '', fiber: '' };

export function ManualEntryForm() {
  const t = useTheme();
  const s = useStyles();
  const db = useSQLiteContext();
  const { bump } = useDataRefresh();
  const { logEntry } = useLogFood();
  const [name, setName] = useState('');
  const [grams, setGrams] = useState('');
  const [per100, setPer100] = useState(false);
  const [values, setValues] = useState(EMPTY);
  const [meal, setMeal] = useState<MealType>(mealForNow());
  const [saveAsFood, setSaveAsFood] = useState(true);

  const num = (v: string) => Math.max(Number(v.replace(',', '.')) || 0, 0);
  const gramsNum = num(grams);

  const save = async () => {
    if (!name.trim()) return Alert.alert('Липсва име', 'Въведи име на храната.');
    if (per100 && gramsNum <= 0) return Alert.alert('Грамаж', 'Въведи изядения грамаж — стойностите са за 100 г.');
    // What the user typed is either per portion or per 100 g; derive the other.
    const typed = { kcal: num(values.kcal), protein: num(values.protein), fat: num(values.fat), carbs: num(values.carbs), fiber: num(values.fiber) };
    const factorToPortion = per100 ? gramsNum / 100 : 1;
    const portion = Object.fromEntries(Object.entries(typed).map(([k, v]) => [k, v * factorToPortion]));
    await logEntry({ meal, name: name.trim(), source: 'manual', grams: gramsNum > 0 ? gramsNum : null, foodId: null, hasMicros: false, n: portion });
    if (saveAsFood && gramsNum > 0) {
      const toPer100 = per100 ? 1 : 100 / gramsNum;
      await saveCustomFood(db, {
        name: name.trim(),
        per100: Object.fromEntries(Object.entries(typed).map(([k, v]) => [k, v * toPer100])),
        portion: { label: '1 порция', grams: gramsNum },
      });
      bump();
    }
    setName('');
    setGrams('');
    setValues(EMPTY);
  };

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 140, paddingTop: 12 }} keyboardShouldPersistTaps="handled">
      <Card>
        <Txt v="label" tone="textMuted" style={s.label}>
          Име на храната
        </Txt>
        <Input value={name} onChangeText={setName} placeholder="напр. Домашна мусака" />

        <Txt v="label" tone="textMuted" style={s.label}>
          Изядено количество (г)
        </Txt>
        <Input value={grams} onChangeText={setGrams} keyboardType="numeric" placeholder="напр. 250" />

        <Txt v="label" tone="textMuted" style={s.label}>
          Стойностите са за
        </Txt>
        <Row gap={8}>
          <Chip label="цялата порция" active={!per100} onPress={() => setPer100(false)} />
          <Chip label="100 г (от етикета)" active={per100} onPress={() => setPer100(true)} />
        </Row>

        <View style={s.grid}>
          {FIELDS.map((f) => (
            <View key={f.key} style={s.field}>
              <Txt v="caption" tone="textMuted" style={{ marginBottom: 6 }}>
                {f.label}
              </Txt>
              <Input value={values[f.key]} onChangeText={(v) => setValues((p) => ({ ...p, [f.key]: v }))} keyboardType="numeric" placeholder="0" />
            </View>
          ))}
        </View>

        <Txt v="label" tone="textMuted" style={s.label}>
          Хранене
        </Txt>
        <Row gap={8} style={{ flexWrap: 'wrap' }}>
          {MEALS.map((m) => (
            <Chip key={m.key} label={`${m.emoji} ${m.label}`} active={meal === m.key} onPress={() => setMeal(m.key)} />
          ))}
        </Row>

        <Pressable style={s.check} onPress={() => setSaveAsFood((v) => !v)}>
          <View style={[s.box, saveAsFood && { backgroundColor: t.c.accent, borderColor: t.c.accent }]}>{saveAsFood && <CheckIcon size={16} color={t.c.onAccent} />}</View>
          <Txt v="small" style={{ flex: 1 }}>
            Запази в „Мои храни“, за да я добавям с едно докосване следващия път (нужен е грамаж)
          </Txt>
        </Pressable>

        <Button label="Запиши в дневника" onPress={save} icon={<CheckIcon size={20} color={t.c.onAccent} />} style={{ marginTop: 18 }} />
      </Card>
    </ScrollView>
  );
}

const useStyles = makeStyles((t) => ({
  label: { marginTop: 16, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 8 },
  field: { width: '48%', marginTop: 10 },
  check: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18 },
  box: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: t.c.border, alignItems: 'center', justifyContent: 'center' },
}));
