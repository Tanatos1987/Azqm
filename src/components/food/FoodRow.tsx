import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { Dot, Txt } from '@/components/ui';
import { PlusIcon, StarIcon } from '@/components/icons';
import { CategoryIcon } from '@/components/LineIcon';
import { MacroLine, useFitColor } from './FoodBits';
import type { Diet } from '@/data/diets';
import { defaultPortion } from '@/data/foods';
import { foodPhoto } from '@/data/foodPhotos';
import { scaleNutrients } from '@/data/nutrients';
import { makeStyles, useTheme } from '@/theme/ThemeContext';
import type { FoodItem } from '@/types';
import { formatNumber } from '@/utils/date';
import { useI18n } from '@/i18n';

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
  // Context subscription: re-renders this memoized row when the language changes.
  const { tr } = useI18n();
  const fitColor = useFitColor();
  const portion = defaultPortion(food);
  const n = scaleNutrients(food.per100, portion.grams);
  const fit = diet.fit(food);
  const photo = foodPhoto(food.category);

  return (
    <Pressable onPress={() => onPress(food)} style={({ pressed }) => [s.row, pressed && { opacity: 0.85 }]}>
      <View style={s.emoji}>
        {photo ? <Image source={photo} style={s.photo} /> : <CategoryIcon category={food.category} size={22} color={t.c.text} />}
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {!food.custom && <Dot color={fitColor(fit)} size={9} />}
          <Txt v="bodyStrong" numberOfLines={2} style={{ flex: 1 }}>
            {food.name}
          </Txt>
        </View>
        <Txt v="caption" tone="textMuted" numberOfLines={1}>
          {portion.label.endsWith(' г') || portion.label.endsWith(' g') ? portion.label : `${portion.label} (${formatNumber(portion.grams)} ${tr('г', 'g')})`} ·{' '}
          {formatNumber(n.kcal)} {tr('ккал', 'kcal')}
        </Txt>
        <MacroLine n={n} carbBasis={diet.carbBasis} />
      </View>
      <Pressable onPress={() => onToggleFavorite(food.id)} hitSlop={8} style={s.star} accessibilityLabel={tr('Любима', 'Favorite')}>
        <StarIcon size={22} color={favorite ? t.c.warning : t.c.textFaint} filled={favorite} />
      </Pressable>
      <Pressable onPress={() => onQuickAdd(food)} hitSlop={6} style={({ pressed }) => [s.add, pressed && { opacity: 0.7 }]} accessibilityLabel={tr('Добави една порция', 'Add one serving')}>
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
    backgroundColor: t.c.card,
    borderRadius: Math.min(t.shape.radius, 18),
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderWidth: t.shape.border ? 1 : 0,
    borderColor: t.c.cardBorder,
  },
  // The food group's photo (or its line icon) in a circle; Deep Glass gives the circle a glass fill and light edge.
  emoji:
    t.fx.backdrop === 'glows'
      ? { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', backgroundColor: t.c.card, borderWidth: 1, borderColor: t.c.cardBorder, alignItems: 'center', justifyContent: 'center' }
      : { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', backgroundColor: t.c.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  photo: { width: '100%', height: '100%' },
  star: { padding: 4 },
  add: { width: 42, height: 42, borderRadius: 21, backgroundColor: t.c.accent, alignItems: 'center', justifyContent: 'center' },
}));
