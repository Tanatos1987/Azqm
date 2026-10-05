import React from 'react';
import { View } from 'react-native';
import { Dot, Txt } from '@/components/ui';
import { FIT_LABEL, type Diet, type FoodFit } from '@/data/diets';
import { netCarbsOf } from '@/data/nutrients';
import { useTheme } from '@/theme/ThemeContext';
import type { Nutrients } from '@/types';
import { formatNumber } from '@/utils/date';
import { useI18n } from '@/i18n';

export function useFitColor() {
  const t = useTheme();
  return (fit: FoodFit) => (fit === 'good' ? t.c.success : fit === 'ok' ? t.c.warning : t.c.danger);
}

export function FitBadge({ fit, diet }: { fit: FoodFit; diet: Diet }) {
  const { tr } = useI18n();
  const color = useFitColor()(fit);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: `${color}22`, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 }}>
      <Dot color={color} size={8} />
      <Txt v="caption" color={color} style={{ fontWeight: '700' }}>
        {FIT_LABEL[fit]} {tr(`за „${diet.name}“`, `for “${diet.name}”`)}
      </Txt>
    </View>
  );
}

/** "Б 20 · М 15 · НВ 3" (EN: "P 20 · F 15 · NC 3") with macro colors. */
export function MacroLine({ n, carbBasis, v = 'caption' }: { n: Nutrients; carbBasis: 'net' | 'total'; v?: 'caption' | 'small' }) {
  const t = useTheme();
  const { tr } = useI18n();
  const carbs = carbBasis === 'net' ? netCarbsOf(n) : n.carbs;
  const part = (label: string, value: number, color: string) => (
    <Txt v={v} tone="textMuted">
      <Txt v={v} color={color} style={{ fontWeight: '700' }}>
        {label}
      </Txt>{' '}
      {formatNumber(value, value < 10 ? 1 : 0)}
    </Txt>
  );
  return (
    <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
      {part(tr('Б', 'P'), n.protein, t.c.protein)}
      {part(tr('М', 'F'), n.fat, t.c.fat)}
      {part(carbBasis === 'net' ? tr('НВ', 'NC') : tr('В', 'C'), carbs, t.c.carbs)}
    </View>
  );
}
