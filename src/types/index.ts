import type { NUTRIENT_KEYS } from '@/data/foods.generated';

/** Every nutrient the app tracks, per 100 g on foods and per portion on diary entries. */
export type NutrientKey = (typeof NUTRIENT_KEYS)[number];
export type Nutrients = Record<NutrientKey, number>;

export type FoodSource = 'photo' | 'barcode' | 'manual' | 'database' | 'custom';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface FoodEntry {
  id: number;
  date: string; // YYYY-MM-DD
  timeIso: string;
  meal: MealType;
  name: string;
  source: FoodSource;
  grams: number | null;
  /** id from the food database or a custom food, when the entry came from one */
  foodId: string | null;
  /** true when the entry carries full vitamin/mineral data (database foods); photo/barcode/manual don't */
  hasMicros: boolean;
  /** nutrients for the whole logged portion */
  n: Nutrients;
}

export type NewFoodEntry = Omit<FoodEntry, 'id' | 'n'> & { n: Partial<Nutrients> };

export type FoodCategory =
  | 'meat'
  | 'deli'
  | 'fish'
  | 'eggs'
  | 'dairy'
  | 'cheese'
  | 'fats'
  | 'vegetables'
  | 'fruits'
  | 'nuts'
  | 'legumes'
  | 'grains'
  | 'sweets'
  | 'sauces'
  | 'drinks'
  | 'alcohol'
  | 'dishes'
  | 'custom';

/**
 * Diet-relevant food tags (see data-src/foodmap): m meat, rm red meat, pm processed meat, f fish, d dairy,
 * e eggs, h honey, r starchy root, b berries, wg whole grain, rg refined grain, s added sugar, fr fried,
 * po refined seed oil, uf ultra-processed.
 */
export type FoodTag = 'm' | 'rm' | 'pm' | 'f' | 'd' | 'e' | 'h' | 'r' | 'b' | 'wg' | 'rg' | 's' | 'fr' | 'po' | 'uf';

export interface Portion {
  label: string;
  grams: number;
}

export interface FoodItem {
  id: string;
  name: string;
  category: FoodCategory;
  tags: FoodTag[];
  aliases: string[];
  portions: Portion[];
  hasMicros: boolean;
  /** nutrients per 100 g */
  per100: Nutrients;
  custom?: boolean;
}

export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'veryActive';
export type WeightGoal = 'lose' | 'maintain' | 'gain';

export interface UserProfile {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  targetWeightKg: number | null;
  activity: ActivityLevel;
  goal: WeightGoal;
}

export interface WeightEntry {
  date: string;
  weightKg: number;
}

/** Sum of every diary entry of one day. */
export interface DaySummary {
  date: string;
  entries: number;
  n: Nutrients;
  /** kcal coming from entries that have full micronutrient data */
  kcalWithMicros: number;
}

export interface HydrationEntry {
  id: number;
  date: string;
  timeIso: string;
  waterMl: number;
  sodiumMg: number;
  potassiumMg: number;
  magnesiumMg: number;
}

export type NewHydrationEntry = Omit<HydrationEntry, 'id'>;

export interface HydrationTotals {
  waterMl: number;
  sodiumMg: number;
  potassiumMg: number;
  magnesiumMg: number;
}

/** Daily targets. `carbs` is net or total carbohydrate depending on the diet's carb basis. */
export interface DailyGoals {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface FastRecord {
  id: number;
  startIso: string;
  endIso: string | null;
  goalHours: number;
}

export type VisionProvider = 'openai' | 'gemini';

export interface VisionAnalysisResult {
  foodName: string;
  estimatedGrams: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
}

export interface OffLookupResult {
  name: string;
  per100: Partial<Nutrients>;
  servingGrams?: number;
}
