/** Nutrients of a dish (Pro): the ingredients added up, then per serving and per 100 g of the finished dish. */
import { addNutrients, emptyNutrients } from '@/data/nutrients';
import type { Nutrients, Recipe } from '@/types';
import { tr } from '@/i18n';

export interface RecipeTotals {
  total: Nutrients;
  /** sum of the ingredients' weights */
  rawGrams: number;
  /** weight of the finished dish (cooking boils water off or soaks it up) */
  cookedGrams: number;
  servingGrams: number;
  perServing: Nutrients;
  per100: Nutrients;
  hasMicros: boolean;
}

export function recipeTotals(r: Pick<Recipe, 'items' | 'servings' | 'cookedGrams'>): RecipeTotals {
  const total = r.items.reduce((acc, it) => addNutrients(acc, it.per100, it.grams / 100), emptyNutrients());
  const rawGrams = r.items.reduce((sum, it) => sum + it.grams, 0);
  const cookedGrams = r.cookedGrams && r.cookedGrams > 0 ? r.cookedGrams : rawGrams;
  const servings = r.servings > 0 ? r.servings : 1;
  const scale = (n: Nutrients, f: number) => addNutrients(emptyNutrients(), n, f);
  return {
    total,
    rawGrams,
    cookedGrams,
    servingGrams: cookedGrams / servings,
    perServing: scale(total, 1 / servings),
    per100: scale(total, cookedGrams > 0 ? 100 / cookedGrams : 0),
    hasMicros: r.items.length > 0 && r.items.every((it) => it.hasMicros),
  };
}

/** The Pro teaser of my dishes (Add tab and the locked screen). */
export function recipesTeaser(): string {
  return tr(
    'Сглоби ястие от продукти с грамажите им и броя порции и го добавяй с едно докосване — с калориите и хранителните стойности на порция.',
    'Build a dish from foods with their amounts and the number of servings and log it with one tap — with the calories and nutrients of a serving.'
  );
}
