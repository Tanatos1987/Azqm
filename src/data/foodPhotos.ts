import type { ImageSourcePropType } from 'react-native';
import type { FoodCategory } from '@/types';

/**
 * One photo per food group (owner's pick, 24.11.2026: option В — "photos of the food as icons"), all in one style:
 * top-down, dark navy stone, soft light; generated with Qwen-Image (Apache-2.0), 160 px WebP (~5 KB each). A group
 * without a photo falls back to its line icon (src/components/LineIcon.tsx).
 */
export const FOOD_PHOTOS: Partial<Record<FoodCategory, ImageSourcePropType>> = {
  meat: require('../../assets/food/meat.webp'),
  deli: require('../../assets/food/deli.webp'),
  fish: require('../../assets/food/fish.webp'),
  eggs: require('../../assets/food/eggs.webp'),
  dairy: require('../../assets/food/dairy.webp'),
  cheese: require('../../assets/food/cheese.webp'),
  fats: require('../../assets/food/fats.webp'),
  vegetables: require('../../assets/food/vegetables.webp'),
  fruits: require('../../assets/food/fruits.webp'),
};

export function foodPhoto(key: string): ImageSourcePropType | undefined {
  return FOOD_PHOTOS[key as FoodCategory];
}
