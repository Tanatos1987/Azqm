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
import { tr, useI18n } from '@/i18n';

const FIELDS = [
  {
    key: 'kcal',
    get label() {
      return tr('Калории (ккал)', 'Calories (kcal)');
    },
  },
  {
    key: 'protein',
    get label() {
      return tr('Протеин (г)', 'Protein (g)');
    },
  },
  {
    key: 'fat',
    get label() {
      return tr('Мазнини (г)', 'Fat (g)');
    },
  },
  {
    key: 'carbs',
    get label() {
      return tr('Въглехидрати общо (г)', 'Total carbs (g)');
    },
  },
  {
    key: 'fiber',
    get label() {
      return tr('Фибри (г)', 'Fiber (g)');
    },
  },
] as const;

type FieldKey = (typeof FIELDS)[number]['key'];
const EMPTY: Record<FieldKey, string> = { kcal: '', protein: '', fat: '', carbs: '', fiber: '' };

export function ManualEntryForm() {
  const t = useTheme();
  const s = useStyles();
  useI18n();
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
    if (!name.trim()) return Alert.alert(tr('Липсва име', 'Name missing'), tr('Въведи име на храната.', 'Enter a name for the food.'));
    if (per100 && gramsNum <= 0)
      return Alert.alert(tr('Грамаж', 'Amount'), tr('Въведи изядения грамаж — стойностите са за 100 г.', 'Enter the amount eaten — the values are per 100 g.'));
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
        portion: { label: tr('1 порция', '1 serving'), grams: gramsNum },
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
          {tr('Име на храната', 'Food name')}
        </Txt>
        <Input value={name} onChangeText={setName} placeholder={tr('напр. Домашна мусака', 'e.g. Homemade moussaka')} />

        <Txt v="label" tone="textMuted" style={s.label}>
          {tr('Изядено количество (г)', 'Amount eaten (g)')}
        </Txt>
        <Input value={grams} onChangeText={setGrams} keyboardType="numeric" placeholder={tr('напр. 250', 'e.g. 250')} />

        <Txt v="label" tone="textMuted" style={s.label}>
          {tr('Стойностите са за', 'Values are for')}
        </Txt>
        <Row gap={8}>
          <Chip label={tr('цялата порция', 'the whole portion')} active={!per100} onPress={() => setPer100(false)} />
          <Chip label={tr('100 г (от етикета)', '100 g (from the label)')} active={per100} onPress={() => setPer100(true)} />
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
          {tr('Хранене', 'Meal')}
        </Txt>
        <Row gap={8} style={{ flexWrap: 'wrap' }}>
          {MEALS.map((m) => (
            <Chip key={m.key} label={`${m.emoji} ${m.label}`} active={meal === m.key} onPress={() => setMeal(m.key)} />
          ))}
        </Row>

        <Pressable style={s.check} onPress={() => setSaveAsFood((v) => !v)}>
          <View style={[s.box, saveAsFood && { backgroundColor: t.c.accent, borderColor: t.c.accent }]}>{saveAsFood && <CheckIcon size={16} color={t.c.onAccent} />}</View>
          <Txt v="small" style={{ flex: 1 }}>
            {tr(
              'Запази в „Мои храни“, за да я добавям с едно докосване следващия път (нужен е грамаж)',
              'Save to “My foods” so you can add it with one tap next time (needs an amount)',
            )}
          </Txt>
        </Pressable>

        <Button label={tr('Запиши в дневника', 'Log to diary')} onPress={save} icon={<CheckIcon size={20} color={t.c.onAccent} />} style={{ marginTop: 18 }} />
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
