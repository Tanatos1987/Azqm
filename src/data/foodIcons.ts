import type { FoodCategory, MealType } from '@/types';
import type { IconKey } from '@/components/LineIcon';
import { mix } from '@/theme/themes';

/**
 * Thin line icons instead of the food and meal emoji (owner's pick, 24.11.2026: option А, with option Б's group
 * colours only in the food-group chips). Names are lucide icons (lucide-react-native, ISC); the drawing is in
 * src/components/LineIcon.tsx, so this table stays plain data.
 */
export const CATEGORY_ICON: Record<FoodCategory, IconKey> = {
  meat: 'beef',
  deli: 'ham',
  fish: 'fish',
  eggs: 'egg',
  dairy: 'milk',
  cheese: 'cheese',
  fats: 'droplet',
  vegetables: 'carrot',
  fruits: 'apple',
  nuts: 'nut',
  legumes: 'bean',
  grains: 'wheat',
  sweets: 'candy',
  sauces: 'droplets',
  drinks: 'coffee',
  alcohol: 'wine',
  dishes: 'soup',
  custom: 'star',
};

/** Group colours for dark backgrounds (from the approved mockup). */
export const CATEGORY_COLOR: Record<FoodCategory, string> = {
  meat: '#F87171',
  deli: '#FB7185',
  fish: '#60A5FA',
  eggs: '#FBBF24',
  dairy: '#E2E8F0',
  cheese: '#FCD34D',
  fats: '#FDE68A',
  vegetables: '#4ADE80',
  fruits: '#F472B6',
  nuts: '#D6A26B',
  legumes: '#A3E635',
  grains: '#F59E0B',
  sweets: '#C084FC',
  sauces: '#FB923C',
  drinks: '#C8A27A',
  alcohol: '#E879F9',
  dishes: '#2DD4BF',
  custom: '#7DD3FC',
};

export const MEAL_ICON: Record<MealType, IconKey> = { breakfast: 'sunrise', lunch: 'sun', dinner: 'moon', snack: 'apple' };

const NEUTRAL = '#A9B1C7';

export function categoryIconKey(key: string): IconKey {
  return CATEGORY_ICON[key as FoodCategory] ?? 'utensils';
}

/** The group colour; on a light theme a darker shade of it, so pale groups (dairy, fats) stay visible. */
export function categoryColor(key: string, scheme: 'dark' | 'light' = 'dark'): string {
  const c = CATEGORY_COLOR[key as FoodCategory] ?? NEUTRAL;
  return scheme === 'light' ? mix(c, '#000000', 0.5) : c;
}
