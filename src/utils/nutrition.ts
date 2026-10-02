import type { Micronutrients, OffPer100g } from '@/types';

export function netCarbsOf(carbs: number, fiber: number): number {
  return Math.max(carbs - fiber, 0);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Scales OpenFoodFacts per-100g macro values to an actual serving size in grams. */
export function scalePer100g(per100g: OffPer100g, grams: number) {
  const factor = grams / 100;
  return {
    calories: round1(per100g.calories * factor),
    protein: round1(per100g.protein * factor),
    fat: round1(per100g.fat * factor),
    carbs: round1(per100g.carbs * factor),
    fiber: round1(per100g.fiber * factor),
  };
}

/** Same as scalePer100g for micronutrients; two decimals since B12/vit D values are tiny. */
export function scaleMicros(per100g: Partial<Micronutrients>, grams: number): Partial<Micronutrients> {
  const factor = grams / 100;
  const scaled: Partial<Micronutrients> = {};
  for (const [key, value] of Object.entries(per100g) as [keyof Micronutrients, number][]) {
    scaled[key] = Math.round(value * factor * 100) / 100;
  }
  return scaled;
}
