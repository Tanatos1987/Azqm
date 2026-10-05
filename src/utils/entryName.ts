import { getFoodById } from '@/data/foods';
import type { FoodEntry } from '@/types';

/** Diary entries store the Bulgarian name; built-in foods are shown in the current app language. */
export function entryDisplayName(entry: Pick<FoodEntry, 'foodId' | 'name'>): string {
  return (entry.foodId ? getFoodById(entry.foodId)?.name : undefined) ?? entry.name;
}
