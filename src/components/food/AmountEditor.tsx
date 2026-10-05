import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Bar, Button, Chip, Input, Row, Txt } from '@/components/ui';
import { MinusIcon, PlusIcon } from '@/components/icons';
import { FitBadge } from './FoodBits';
import { useSettings } from '@/context/SettingsContext';
import { useProfile } from '@/context/ProfileContext';
import { getDiet } from '@/data/diets';
import { categoryLabel, portionOptions } from '@/data/foods';
import { ANALYZED_NUTRIENTS, NUTRIENT_META, formatAmount, netCarbsOf, nutrientTarget, scaleNutrients } from '@/data/nutrients';
import { makeStyles, useTheme } from '@/theme/ThemeContext';
import type { FoodItem, MealType, Nutrients } from '@/types';
import { MEALS, formatNumber } from '@/utils/date';
import { tr, useI18n } from '@/i18n';

export interface AmountResult {
  grams: number;
  meal: MealType;
  n: Nutrients;
}

interface AmountEditorProps {
  food: FoodItem;
  initialGrams: number;
  initialMeal: MealType;
  primaryLabel: string;
  onSubmit: (r: AmountResult) => void;
  /** extra buttons under the primary one (delete, add again…) */
  children?: React.ReactNode;
  /** hide the diet badge (custom/unknown foods) */
  hideFit?: boolean;
}

function stepFor(grams: number, food: FoodItem): number {
  const smallest = food.portions[0]?.grams ?? 100;
  if (smallest <= 15) return 5;
  if (grams < 200) return 10;
  return 25;
}

export function AmountEditor({ food, initialGrams, initialMeal, primaryLabel, onSubmit, children, hideFit }: AmountEditorProps) {
  const t = useTheme();
  const s = useStyles();
  useI18n();
  const { dietId } = useSettings();
  const { profile } = useProfile();
  const diet = getDiet(dietId);
  const [gramsText, setGramsText] = useState(String(Math.round(initialGrams)));
  const [meal, setMeal] = useState<MealType>(initialMeal);
  const [showMicros, setShowMicros] = useState(false);

  const grams = Math.max(Number(gramsText.replace(',', '.')) || 0, 0);
  const n = useMemo(() => scaleNutrients(food.per100, grams), [food, grams]);
  const carbs = diet.carbBasis === 'net' ? netCarbsOf(n) : n.carbs;
  const step = stepFor(grams, food);
  const setGrams = (g: number) => setGramsText(String(Math.max(Math.round(g), 0)));

  const micros = useMemo(() => {
    if (!food.hasMicros) return [];
    return ANALYZED_NUTRIENTS.filter((k) => k !== 'sugar' && k !== 'satFat' && k !== 'fiber')
      .map((k) => {
        const target = nutrientTarget(k, profile, diet, 2000);
        const pct = target?.min ? n[k] / target.min : 0;
        return { k, pct, value: n[k] };
      })
      .sort((a, b) => b.pct - a.pct);
  }, [food, n, profile, diet]);

  return (
    <View>
      <Txt v="h2">{food.name}</Txt>
      <Row style={{ marginTop: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        <Txt v="small" tone="textMuted">
          {categoryLabel(food.category)} · {formatNumber(food.per100.kcal)} {tr('ккал / 100 г', 'kcal / 100 g')}
        </Txt>
      </Row>
      {!hideFit && (
        <View style={{ marginBottom: 14 }}>
          <FitBadge fit={diet.fit(food)} diet={diet} />
        </View>
      )}

      <Row gap={12} style={{ justifyContent: 'center' }}>
        <Pressable style={s.stepBtn} onPress={() => setGrams(grams - step)} hitSlop={6}>
          <MinusIcon size={26} color={t.c.text} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Input big value={gramsText} onChangeText={setGramsText} keyboardType="numeric" selectTextOnFocus style={s.gramsInput} maxLength={5} />
          <Txt v="caption" tone="textMuted" style={{ marginTop: 4 }}>
            {tr('грама', 'grams')}
          </Txt>
        </View>
        <Pressable style={s.stepBtn} onPress={() => setGrams(grams + step)} hitSlop={6}>
          <PlusIcon size={26} color={t.c.text} />
        </Pressable>
      </Row>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} keyboardShouldPersistTaps="handled">
        {portionOptions(food).map((p) => (
          <Chip
            key={`${p.label}-${p.grams}`}
            label={p.label.endsWith(' г') || p.label.endsWith(' g') ? p.label : `${p.label} · ${formatNumber(p.grams)} ${tr('г', 'g')}`}
            active={Math.round(grams) === Math.round(p.grams)}
            onPress={() => setGrams(p.grams)}
          />
        ))}
      </ScrollView>

      <Txt v="label" tone="textMuted" style={{ marginBottom: 8 }}>
        {tr('Хранене', 'Meal')}
      </Txt>
      <Row gap={8} style={{ flexWrap: 'wrap', marginBottom: 18 }}>
        {MEALS.map((m) => (
          <Chip key={m.key} label={`${m.emoji} ${m.label}`} active={meal === m.key} onPress={() => setMeal(m.key)} />
        ))}
      </Row>

      <View style={s.preview}>
        <View style={{ alignItems: 'center', minWidth: 86 }}>
          <Txt v="h1" tone="accent">
            {formatNumber(n.kcal)}
          </Txt>
          <Txt v="caption" tone="textMuted">
            {tr('ккал', 'kcal')}
          </Txt>
        </View>
        <View style={{ flex: 1, gap: 8 }}>
          <MacroRow label={tr('Протеин', 'Protein')} value={n.protein} color={t.c.protein} />
          <MacroRow label={tr('Мазнини', 'Fat')} value={n.fat} color={t.c.fat} />
          <MacroRow label={diet.carbBasis === 'net' ? tr('Нетни въгл.', 'Net carbs') : tr('Въглехидрати', 'Carbs')} value={carbs} color={t.c.carbs} />
          <MacroRow label={tr('Фибри', 'Fiber')} value={n.fiber} color={t.c.fiber} />
        </View>
      </View>

      {food.hasMicros ? (
        <>
          <Pressable onPress={() => setShowMicros((v) => !v)} style={{ paddingVertical: 12 }} hitSlop={6}>
            <Txt v="smallStrong" tone="accent">
              {showMicros ? tr('Скрий витамините и минералите ▲', 'Hide vitamins and minerals ▲') : tr('Витамини и минерали в порцията ▼', 'Vitamins and minerals in this portion ▼')}
            </Txt>
          </Pressable>
          {showMicros && (
            <View style={{ gap: 10, marginBottom: 8 }}>
              {micros.map(({ k, pct, value }) => (
                <View key={k}>
                  <Row style={{ justifyContent: 'space-between', marginBottom: 4 }}>
                    <Txt v="small">{NUTRIENT_META[k].label}</Txt>
                    <Txt v="caption" tone="textMuted">
                      {formatAmount(value, k)} {NUTRIENT_META[k].unit} · {Math.round(pct * 100)}%
                    </Txt>
                  </Row>
                  <Bar value={pct} max={1} height={6} color={t.c.info} />
                </View>
              ))}
              <Txt v="caption" tone="textFaint">
                {tr(
                  '% от препоръчителния дневен прием. Стойностите са средни (USDA) и варират според продукта.',
                  '% of the recommended daily intake. Values are averages (USDA) and vary by product.',
                )}
              </Txt>
            </View>
          )}
        </>
      ) : (
        <Txt v="caption" tone="textFaint" style={{ marginVertical: 10 }}>
          {tr('За тази храна няма пълни данни за витамини и минерали.', 'No full vitamin and mineral data for this food.')}
        </Txt>
      )}

      <Button
        label={`${primaryLabel} · ${formatNumber(n.kcal)} ${tr('ккал', 'kcal')}`}
        onPress={() => grams > 0 && onSubmit({ grams, meal, n })}
        disabled={grams <= 0}
        style={{ marginTop: 10 }}
      />
      {children}
    </View>
  );
}

function MacroRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <Row gap={8}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
        <Txt v="small">{label}</Txt>
      </Row>
      <Txt v="smallStrong">
        {formatNumber(value, value < 10 ? 1 : 0)} {tr('г', 'g')}
      </Txt>
    </Row>
  );
}

const useStyles = makeStyles((t) => ({
  stepBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: t.c.surfaceAlt,
    borderWidth: 1,
    borderColor: t.c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gramsInput: { width: 130 },
  chips: { gap: 8, paddingVertical: 16 },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: t.c.surfaceAlt,
    borderRadius: 18,
    padding: 16,
  },
}));
