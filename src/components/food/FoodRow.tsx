import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Dot, Txt } from '@/components/ui';
import { PlusIcon, StarIcon } from '@/components/icons';
import { MacroLine, useFitColor } from './FoodBits';
import type { Diet } from '@/data/diets';
import { categoryEmoji, defaultPortion } from '@/data/foods';
import { scaleNutrients } from '@/data/nutrients';
import { makeStyles, useTheme } from '@/theme/ThemeContext';
import type { FoodItem } from '@/types';
import { formatNumber } from '@/utils/date';

interface FoodRowProps {
  food: FoodItem;
  diet: Diet;
  favorite: boolean;
  // Callbacks receive the food so the list can pass stable functions and React.memo can skip unchanged rows.
  onPress: (food: FoodItem) => void;
  onQuickAdd: (food: FoodItem) => void;
  onToggleFavorite: (id: string) => void;
}

export const FoodRow = React.memo(function FoodRow({ food, diet, favorite, onPress, onQuickAdd, onToggleFavorite }: FoodRowProps) {
  const t = useTheme();
  const s = useStyles();
  const fitColor = useFitColor();
  const portion = defaultPortion(food);
  const n = scaleNutrients(food.per100, portion.grams);
  const fit = diet.fit(food);

  return (
    <Pressable onPress={() => onPress(food)} style={({ pressed }) => [s.row, pressed && { opacity: 0.85 }]}>
      <View style={s.emoji}>
        <Text style={{ fontSize: 22 }}>{categoryEmoji(food.category)}</Text>
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {!food.custom && <Dot color={fitColor(fit)} size={9} />}
          <Txt v="bodyStrong" numberOfLines={2} style={{ flex: 1 }}>
            {food.name}
          </Txt>
        </View>
        <Txt v="caption" tone="textMuted" numberOfLines={1}>
          {portion.label.endsWith(' г') ? portion.label : `${portion.label} (${formatNumber(portion.grams)} г)`} · {formatNumber(n.kcal)} ккал
        </Txt>
        <MacroLine n={n} carbBasis={diet.carbBasis} />
      </View>
      <Pressable onPress={() => onToggleFavorite(food.id)} hitSlop={8} style={s.star} accessibilityLabel="Любима">
        <StarIcon size={22} color={favorite ? t.c.warning : t.c.textFaint} filled={favorite} />
      </Pressable>
      <Pressable onPress={() => onQuickAdd(food)} hitSlop={6} style={({ pressed }) => [s.add, pressed && { opacity: 0.7 }]} accessibilityLabel="Добави една порция">
        <PlusIcon size={22} color={t.c.onAccent} />
      </Pressable>
    </Pressable>
  );
});

const useStyles = makeStyles((t) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: t.c.surface,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderWidth: t.dark ? 0 : 1,
    borderColor: t.c.border,
  },
  emoji: { width: 44, height: 44, borderRadius: 22, backgroundColor: t.c.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  star: { padding: 4 },
  add: { width: 42, height: 42, borderRadius: 21, backgroundColor: t.c.accent, alignItems: 'center', justifyContent: 'center' },
}));
