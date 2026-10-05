import React from 'react';
import { View } from 'react-native';
import { Dot, Txt } from '@/components/ui';
import { FIT_LABEL, type Diet, type FoodFit } from '@/data/diets';
import { netCarbsOf } from '@/data/nutrients';
import { useTheme } from '@/theme/ThemeContext';
import type { Nutrients } from '@/types';
import { formatNumber } from '@/utils/date';

export function useFitColor() {
  const t = useTheme();
  return (fit: FoodFit) => (fit === 'good' ? t.c.success : fit === 'ok' ? t.c.warning : t.c.danger);
}

export function FitBadge({ fit, diet }: { fit: FoodFit; diet: Diet }) {
  const color = useFitColor()(fit);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: `${color}22`, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 }}>
      <Dot color={color} size={8} />
      <Txt v="caption" color={color} style={{ fontWeight: '700' }}>
        {FIT_LABEL[fit]} за „{diet.name}“
      </Txt>
    </View>
  );
}

/** "Б 20 · М 15 · НВ 3" with macro colors. */
export function MacroLine({ n, carbBasis, v = 'caption' }: { n: Nutrients; carbBasis: 'net' | 'total'; v?: 'caption' | 'small' }) {
  const t = useTheme();
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
      {part('Б', n.protein, t.c.protein)}
      {part('М', n.fat, t.c.fat)}
      {part(carbBasis === 'net' ? 'НВ' : 'В', carbs, t.c.carbs)}
    </View>
  );
}
