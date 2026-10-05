import type { ActivityLevel, DailyGoals, Sex, UserProfile, WeightGoal } from '@/types';
import type { Diet } from '@/data/diets';

export const ACTIVITY_LEVELS: { value: ActivityLevel; label: string; hint: string; factor: number }[] = [
  { value: 'sedentary', label: 'Заседнал', hint: 'Офис работа, почти без спорт', factor: 1.2 },
  { value: 'light', label: 'Леко активен', hint: 'Спорт 1–3 пъти седмично', factor: 1.375 },
  { value: 'moderate', label: 'Умерено активен', hint: 'Спорт 3–5 пъти седмично', factor: 1.55 },
  { value: 'active', label: 'Много активен', hint: 'Тренировки 6–7 пъти седмично', factor: 1.725 },
  { value: 'veryActive', label: 'Изключително активен', hint: 'Физически труд + тренировки', factor: 1.9 },
];

export const WEIGHT_GOALS: { value: WeightGoal; label: string; calorieFactor: number }[] = [
  { value: 'lose', label: 'Отслабване', calorieFactor: 0.8 },
  { value: 'maintain', label: 'Задържане', calorieFactor: 1 },
  { value: 'gain', label: 'Качване', calorieFactor: 1.1 },
];

/** Don't suggest intakes below these without medical supervision. */
const MIN_CALORIES: Record<Sex, number> = { male: 1500, female: 1200 };

export type BmiTone = 'info' | 'success' | 'warning' | 'danger';

export function bmiOf(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return m > 0 ? weightKg / (m * m) : 0;
}

export function bmiCategory(bmi: number): { label: string; tone: BmiTone } {
  if (bmi < 18.5) return { label: 'Поднормено тегло', tone: 'info' };
  if (bmi < 25) return { label: 'Нормално тегло', tone: 'success' };
  if (bmi < 30) return { label: 'Наднормено тегло', tone: 'warning' };
  return { label: 'Затлъстяване', tone: 'danger' };
}

/** Weight range for a healthy BMI (18.5–24.9) at the given height. */
export function healthyWeightRange(heightCm: number): [number, number] {
  const m = heightCm / 100;
  return [18.5 * m * m, 24.9 * m * m];
}

/** Basal metabolic rate, Mifflin-St Jeor. */
export function bmrOf({ sex, age, heightCm, weightKg }: Pick<UserProfile, 'sex' | 'age' | 'heightCm' | 'weightKg'>): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'male' ? base + 5 : base - 161;
}

export function tdeeOf(profile: UserProfile): number {
  const factor = ACTIVITY_LEVELS.find((a) => a.value === profile.activity)?.factor ?? 1.2;
  return bmrOf(profile) * factor;
}

export interface ProfileMetrics {
  bmi: number;
  bmr: number;
  tdee: number;
  goals: DailyGoals;
}

/** Calorie target from TDEE and the weight goal, split into macros by the diet. */
export function computeMetrics(profile: UserProfile, diet: Diet): ProfileMetrics {
  const bmr = bmrOf(profile);
  const tdee = tdeeOf(profile);
  const factor = WEIGHT_GOALS.find((g) => g.value === profile.goal)?.calorieFactor ?? 1;
  const calories = diet.noCalories ? 0 : Math.max(tdee * factor, MIN_CALORIES[profile.sex]);
  let carbs = (calories * diet.split.carbs) / 4;
  if (diet.carbCapG != null) carbs = Math.min(carbs, diet.carbCapG);
  return {
    bmi: bmiOf(profile.weightKg, profile.heightCm),
    bmr,
    tdee,
    goals: {
      calories: Math.round(calories),
      protein: Math.round((calories * diet.split.protein) / 4),
      fat: Math.round((calories * diet.split.fat) / 9),
      carbs: Math.round(carbs),
    },
  };
}

/** ~35 ml per kg, rounded to a glass, at least 2 l. */
export function waterGoalMl(profile: UserProfile | null): number {
  if (!profile) return 2500;
  return Math.max(2000, Math.round((profile.weightKg * 35) / 250) * 250);
}
