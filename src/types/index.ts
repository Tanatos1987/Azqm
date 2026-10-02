export type FoodSource = 'photo' | 'barcode' | 'manual' | 'database';

export interface MacroTotals {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  netCarbs: number;
}

export interface Micronutrients {
  sodiumMg: number;
  potassiumMg: number;
  magnesiumMg: number;
  calciumMg: number;
  ironMg: number;
  zincMg: number;
  vitaminAMcg: number;
  vitaminCMg: number;
  vitaminDMcg: number;
  vitaminB12Mcg: number;
}

export type MicroKey = keyof Micronutrients;

export interface FoodEntry extends MacroTotals {
  id: number;
  date: string; // YYYY-MM-DD
  timeIso: string;
  name: string;
  source: FoodSource;
  grams: number | null;
  micros: Micronutrients;
  /** id from the bundled food database (src/data/foods.ts), when the entry came from it */
  foodId: string | null;
}

/** Micros and foodId are optional on insert — photo/barcode/manual entries have no micronutrient data. */
export type NewFoodEntry = Omit<FoodEntry, 'id' | 'micros' | 'foodId'> & {
  micros?: Partial<Micronutrients>;
  foodId?: string | null;
};

export interface FoodItem {
  id: string;
  name: string;
  category: FoodCategory;
  per100g: OffPer100g;
  micros: Partial<Micronutrients>; // per 100 g
  portion?: { label: string; grams: number };
}

export type FoodCategory =
  | 'meat'
  | 'deli'
  | 'fish'
  | 'dairy'
  | 'cheese'
  | 'fats'
  | 'vegetables'
  | 'fruits'
  | 'nuts'
  | 'grains'
  | 'dishes'
  | 'drinks';

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

export interface DailyCalories {
  date: string;
  calories: number;
  netCarbs: number;
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

export interface DailyGoals {
  calories: number;
  protein: number;
  fat: number;
  netCarbs: number;
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
  netCarbs: number;
}

export interface OffPer100g {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
}

export interface OffLookupResult {
  name: string;
  per100g: OffPer100g;
  servingGrams?: number;
}
