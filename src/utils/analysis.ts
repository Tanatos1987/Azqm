import type { DaySummary, FoodEntry, FoodItem, HydrationTotals, NutrientKey, Nutrients, UserProfile } from '@/types';
import { ANALYZED_NUTRIENTS, addNutrients, emptyNutrients, netCarbsOf, nutrientTarget, type NutrientTarget } from '@/data/nutrients';
import type { Diet } from '@/data/diets';
import { defaultPortion } from '@/data/foods';
import { locale, tr } from '@/i18n';
import { todayKey } from './date';
import { entryDisplayName } from './entryName';

export interface PeriodStats {
  /** days with at least one entry, oldest first */
  days: DaySummary[];
  /** days used for the averages (complete days; today only when nothing else exists) */
  avgDays: DaySummary[];
  todayExcluded: boolean;
  /** average per day of every nutrient, electrolyte supplements included */
  avg: Nutrients;
  minKcal: number;
  maxKcal: number;
  /** share of calories that came with full vitamin/mineral data (0..1) */
  microCoverage: number;
}

export function computePeriodStats(days: DaySummary[], hydration: Map<string, HydrationTotals>): PeriodStats {
  const today = todayKey();
  const complete = days.filter((d) => d.date !== today);
  const avgDays = complete.length > 0 ? complete : days;
  let total = emptyNutrients();
  let kcalMicros = 0;
  for (const d of avgDays) {
    total = addNutrients(total, d.n);
    const h = hydration.get(d.date);
    if (h) total = addNutrients(total, { sodium: h.sodiumMg, potassium: h.potassiumMg, magnesium: h.magnesiumMg });
    kcalMicros += d.kcalWithMicros;
  }
  const count = Math.max(avgDays.length, 1);
  const avg = emptyNutrients();
  for (const k of Object.keys(total) as NutrientKey[]) avg[k] = total[k] / count;
  const kcals = avgDays.map((d) => d.n.kcal);
  return {
    days,
    avgDays,
    todayExcluded: avgDays.length !== days.length,
    avg,
    minKcal: kcals.length ? Math.min(...kcals) : 0,
    maxKcal: kcals.length ? Math.max(...kcals) : 0,
    microCoverage: total.kcal > 0 ? Math.min(kcalMicros / total.kcal, 1) : 0,
  };
}

export type VerdictStatus = 'low' | 'ok' | 'high';

export interface NutrientVerdict {
  key: NutrientKey;
  avg: number;
  target: NutrientTarget;
  /** avg / recommended amount (only when there is one) */
  pct: number | null;
  status: VerdictStatus;
}

/** Below this share of the recommended amount a nutrient counts as "не достига". */
export const LOW_THRESHOLD = 0.7;

export function analyzeNutrients(avg: Nutrients, profile: UserProfile | null, diet: Diet, kcalGoal: number): NutrientVerdict[] {
  const out: NutrientVerdict[] = [];
  for (const key of ANALYZED_NUTRIENTS) {
    const target = nutrientTarget(key, profile, diet, kcalGoal);
    if (!target) continue;
    const value = avg[key];
    const pct = target.min ? value / target.min : null;
    const maxValue = target.maxKey ? avg[target.maxKey] : value;
    let status: VerdictStatus = 'ok';
    if (target.max != null && maxValue > target.max) status = 'high';
    else if (pct != null && pct < LOW_THRESHOLD) status = 'low';
    out.push({ key, avg: value, target, pct, status });
  }
  return out;
}

export interface MacroCheck {
  kind: 'warning' | 'info';
  text: string;
}

/** Plain-language checks on the averages: calories vs BMR, protein per kg, carbs vs the diet cap. */
export function macroChecks(avg: Nutrients, profile: UserProfile | null, diet: Diet, goals: { calories: number; carbs: number }, bmr: number | null): MacroCheck[] {
  const out: MacroCheck[] = [];
  if (diet.noCalories) return out;
  if (bmr && avg.kcal > 0 && avg.kcal < bmr * 0.85) {
    out.push({
      kind: 'warning',
      text: tr(
        `Средният прием (${Math.round(avg.kcal)} ккал) е под базовия метаболизъм (${Math.round(bmr)} ккал). Дълго така може да забави метаболизма и да стопи мускули.`,
        `Your average intake (${Math.round(avg.kcal)} kcal) is below your basal metabolic rate (${Math.round(bmr)} kcal). Over time this can slow your metabolism and cost muscle.`
      ),
    });
  }
  if (profile && avg.kcal > 0) {
    const perKg = avg.protein / profile.weightKg;
    if (perKg < 0.8) {
      out.push({
        kind: 'warning',
        text: tr(
          `Протеинът е ${perKg.toLocaleString(locale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 })} г/кг — под минимума от 0,8 г на кг телесно тегло.`,
          `Protein is ${perKg.toLocaleString(locale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 })} g/kg — below the minimum of 0.8 g per kg of body weight.`
        ),
      });
    }
  }
  const carbs = diet.carbBasis === 'net' ? netCarbsOf(avg) : avg.carbs;
  if (diet.carbCapG != null && carbs > diet.carbCapG * 1.2) {
    out.push({
      kind: 'warning',
      text: tr(
        `Средно ${Math.round(carbs)} г нетни въглехидрати — над границата от ${diet.carbCapG} г за режима „${diet.name}“.`,
        `On average ${Math.round(carbs)} g net carbs — above the ${diet.carbCapG} g limit for the “${diet.name}” diet.`
      ),
    });
  }
  if (goals.calories > 0 && avg.kcal > goals.calories * 1.1) {
    out.push({
      kind: 'info',
      text: tr(
        `Средно приемаш с ${Math.round(avg.kcal - goals.calories)} ккал повече от дневната цел.`,
        `On average you eat ${Math.round(avg.kcal - goals.calories)} kcal more than your daily goal.`
      ),
    });
  }
  return out;
}

export interface FoodSuggestion {
  food: FoodItem;
  amount: number;
  portionLabel: string;
  portionGrams: number;
}

const SUGGESTION_CATEGORIES = new Set(['meat', 'fish', 'eggs', 'dairy', 'cheese', 'vegetables', 'fruits', 'nuts', 'legumes', 'grains', 'fats']);

/** Foods that give the most of `key` per usual portion, among foods that suit the diet. */
export function topSources(key: NutrientKey, diet: Diet, foods: FoodItem[], count = 5): FoodSuggestion[] {
  const out: FoodSuggestion[] = [];
  for (const f of foods) {
    if (!f.hasMicros || !SUGGESTION_CATEGORIES.has(f.category)) continue;
    if (diet.fit(f) === 'avoid') continue;
    const p = defaultPortion(f);
    const kcal = (f.per100.kcal * p.grams) / 100;
    if (kcal > 450) continue;
    // Skip liver-type extremes for vitamin A suggestions — they push retinol past the safe limit.
    if (key === 'vitA' && f.per100.retinol > 1500) continue;
    out.push({ food: f, amount: (f.per100[key] * p.grams) / 100, portionLabel: p.label, portionGrams: p.grams });
  }
  out.sort((a, b) => b.amount - a.amount);
  const seen = new Set<string>();
  const unique: FoodSuggestion[] = [];
  for (const s of out) {
    const stem = s.food.name.split(/[ ,]/)[0];
    if (seen.has(stem)) continue;
    seen.add(stem);
    unique.push(s);
    if (unique.length >= count) break;
  }
  return unique;
}

export interface Contributor {
  name: string;
  share: number;
}

/** Which logged foods supplied most of a nutrient in the period. */
export function topContributors(entries: FoodEntry[], key: NutrientKey, count = 3): Contributor[] {
  const byName = new Map<string, number>();
  let total = 0;
  for (const e of entries) {
    const v = e.n[key];
    if (v <= 0) continue;
    const name = entryDisplayName(e);
    byName.set(name, (byName.get(name) ?? 0) + v);
    total += v;
  }
  if (total <= 0) return [];
  return Array.from(byName.entries())
    .map(([name, v]) => ({ name, share: v / total }))
    .sort((a, b) => b.share - a.share)
    .slice(0, count);
}

/** Calories → expected weight change per week (≈7700 kcal per kg of body fat). */
export function weeklyWeightChange(avgKcal: number, tdee: number): number {
  return ((avgKcal - tdee) * 7) / 7700;
}
