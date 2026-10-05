import type { NutrientKey, Nutrients, UserProfile } from '@/types';
import { NUTRIENT_KEYS } from './foods.generated';
import type { Diet } from './diets';
import { locale, tr } from '@/i18n';

export { NUTRIENT_KEYS };

export type NutrientGroup = 'energy' | 'macro' | 'mineral' | 'vitamin';

export interface NutrientMeta {
  key: NutrientKey;
  label: string;
  unit: string;
  group: NutrientGroup;
  /** decimals shown for typical daily amounts */
  decimals: number;
  info: string;
}

type Unit = 'kcal' | 'g' | 'mg' | 'mcg';

const UNIT_LABELS: Record<Unit, [string, string]> = {
  kcal: ['ккал', 'kcal'],
  g: ['г', 'g'],
  mg: ['мг', 'mg'],
  mcg: ['мкг', 'µg'],
};

/** label / unit / info are getters, so they follow the current UI language. */
const meta = (key: NutrientKey, label: [string, string], unit: Unit, group: NutrientGroup, decimals: number, info: [string, string]): NutrientMeta => ({
  key,
  get label() {
    return tr(label[0], label[1]);
  },
  get unit() {
    return tr(UNIT_LABELS[unit][0], UNIT_LABELS[unit][1]);
  },
  group,
  decimals,
  get info() {
    return tr(info[0], info[1]);
  },
});

export const NUTRIENT_META: Record<NutrientKey, NutrientMeta> = {
  kcal: meta('kcal', ['Калории', 'Calories'], 'kcal', 'energy', 0, ['Енергия.', 'Energy.']),
  protein: meta('protein', ['Протеин', 'Protein'], 'g', 'macro', 0, ['Мускули, ситост, имунитет.', 'Muscle, fullness, immunity.']),
  fat: meta('fat', ['Мазнини', 'Fat'], 'g', 'macro', 0, ['Енергия, хормони, усвояване на витамините A, D, E, K.', 'Energy, hormones, absorption of vitamins A, D, E, K.']),
  carbs: meta('carbs', ['Въглехидрати', 'Carbs'], 'g', 'macro', 0, ['Основен източник на бърза енергия.', 'The main source of quick energy.']),
  fiber: meta('fiber', ['Фибри', 'Fiber'], 'g', 'macro', 0, [
    'Храносмилане, ситост, по-равна кръвна захар. Зеленчуци, бобови, ядки, семена.',
    'Digestion, fullness, steadier blood sugar. Vegetables, legumes, nuts, seeds.',
  ]),
  sugar: meta('sugar', ['Захари', 'Sugars'], 'g', 'macro', 0, [
    'Общо захари, вкл. от плодове и мляко. Препоръка: под 10% от калориите.',
    'Total sugars, incl. from fruit and milk. Recommended: under 10% of calories.',
  ]),
  satFat: meta('satFat', ['Наситени мазнини', 'Saturated fat'], 'g', 'macro', 0, [
    'Препоръка при обичайно хранене: под 10% от калориите.',
    'Recommended on a typical diet: under 10% of calories.',
  ]),
  sodium: meta('sodium', ['Натрий', 'Sodium'], 'mg', 'mineral', 0, [
    'Течности и кръвно налягане. Основно от сол, колбаси, сирена, хляб.',
    'Fluids and blood pressure. Mostly from salt, cured meats, cheese, bread.',
  ]),
  potassium: meta('potassium', ['Калий', 'Potassium'], 'mg', 'mineral', 0, [
    'Сърце, мускули, кръвно налягане. Зеленчуци, авокадо, бобови, риба.',
    'Heart, muscles, blood pressure. Vegetables, avocado, legumes, fish.',
  ]),
  magnesium: meta('magnesium', ['Магнезий', 'Magnesium'], 'mg', 'mineral', 0, [
    'Мускули, нерви, сън, енергия. Семена, ядки, листни зеленчуци, какао.',
    'Muscles, nerves, sleep, energy. Seeds, nuts, leafy greens, cocoa.',
  ]),
  calcium: meta('calcium', ['Калций', 'Calcium'], 'mg', 'mineral', 0, [
    'Кости и зъби, мускулни съкращения. Млечни, сирена, сардини, сусам.',
    'Bones and teeth, muscle contraction. Dairy, cheese, sardines, sesame.',
  ]),
  phosphorus: meta('phosphorus', ['Фосфор', 'Phosphorus'], 'mg', 'mineral', 0, ['Кости и енергиен метаболизъм.', 'Bones and energy metabolism.']),
  iron: meta('iron', ['Желязо', 'Iron'], 'mg', 'mineral', 1, [
    'Пренос на кислород; дефицитът води до умора. Червено месо, дроб, бобови, спанак.',
    'Carries oxygen; a deficiency causes fatigue. Red meat, liver, legumes, spinach.',
  ]),
  zinc: meta('zinc', ['Цинк', 'Zinc'], 'mg', 'mineral', 1, ['Имунитет, кожа, заздравяване. Месо, миди, семена.', 'Immunity, skin, healing. Meat, shellfish, seeds.']),
  copper: meta('copper', ['Мед', 'Copper'], 'mg', 'mineral', 2, ['Кръвообразуване, нервна система. Дроб, ядки, какао.', 'Blood formation, nervous system. Liver, nuts, cocoa.']),
  manganese: meta('manganese', ['Манган', 'Manganese'], 'mg', 'mineral', 1, ['Кости, обмяна на веществата. Ядки, пълнозърнести, чай.', 'Bones, metabolism. Nuts, whole grains, tea.']),
  selenium: meta('selenium', ['Селен', 'Selenium'], 'mcg', 'mineral', 0, ['Щитовидна жлеза, антиоксидант. Риба, яйца, бразилски орех.', 'Thyroid, antioxidant. Fish, eggs, Brazil nuts.']),
  vitA: meta('vitA', ['Витамин A', 'Vitamin A'], 'mcg', 'vitamin', 0, [
    'Зрение, кожа, имунитет. Излишък идва главно от черен дроб и добавки.',
    'Vision, skin, immunity. Excess comes mainly from liver and supplements.',
  ]),
  retinol: meta('retinol', ['Ретинол', 'Retinol'], 'mcg', 'vitamin', 0, ['Готова форма на витамин A (от животински храни).', 'Preformed vitamin A (from animal foods).']),
  vitC: meta('vitC', ['Витамин C', 'Vitamin C'], 'mg', 'vitamin', 0, [
    'Имунитет, колаген, усвояване на желязо. Чушки, цитрусови, зеле, броколи.',
    'Immunity, collagen, iron absorption. Peppers, citrus, cabbage, broccoli.',
  ]),
  vitD: meta('vitD', ['Витамин D', 'Vitamin D'], 'mcg', 'vitamin', 1, [
    'Кости и имунитет. Образува се от слънцето; от храна — мазна риба, яйца.',
    'Bones and immunity. Made from sunlight; from food — oily fish, eggs.',
  ]),
  vitE: meta('vitE', ['Витамин E', 'Vitamin E'], 'mg', 'vitamin', 1, ['Антиоксидант. Ядки, семена, растителни масла.', 'Antioxidant. Nuts, seeds, vegetable oils.']),
  vitK: meta('vitK', ['Витамин K', 'Vitamin K'], 'mcg', 'vitamin', 0, ['Съсирване на кръвта и кости. Листни зеленчуци.', 'Blood clotting and bones. Leafy greens.']),
  b1: meta('b1', ['Витамин B1', 'Vitamin B1'], 'mg', 'vitamin', 2, ['Тиамин — енергия от храната, нервна система.', 'Thiamine — energy from food, nervous system.']),
  b2: meta('b2', ['Витамин B2', 'Vitamin B2'], 'mg', 'vitamin', 2, ['Рибофлавин — енергиен метаболизъм, кожа и очи.', 'Riboflavin — energy metabolism, skin and eyes.']),
  b3: meta('b3', ['Витамин B3', 'Vitamin B3'], 'mg', 'vitamin', 0, ['Ниацин — енергиен метаболизъм.', 'Niacin — energy metabolism.']),
  b6: meta('b6', ['Витамин B6', 'Vitamin B6'], 'mg', 'vitamin', 2, ['Метаболизъм на протеини, нервна система.', 'Protein metabolism, nervous system.']),
  folate: meta('folate', ['Фолат (B9)', 'Folate (B9)'], 'mcg', 'vitamin', 0, [
    'Кръвообразуване, клетъчно делене; важен при бременност. Листни зеленчуци, бобови.',
    'Blood formation, cell division; important in pregnancy. Leafy greens, legumes.',
  ]),
  b12: meta('b12', ['Витамин B12', 'Vitamin B12'], 'mcg', 'vitamin', 1, [
    'Нерви и кръв. Има го само в животински храни — при веган режим е нужна добавка.',
    'Nerves and blood. Found only in animal foods — on a vegan diet you need a supplement.',
  ]),
  omega3: meta('omega3', ['Омега-3', 'Omega-3'], 'g', 'vitamin', 1, ['Сърце и мозък. Мазна риба, ленено семе, чиа, орехи.', 'Heart and brain. Oily fish, flaxseed, chia, walnuts.']),
};

/** Nutrients checked on the Анализ tab, in display order. */
export const ANALYZED_NUTRIENTS: NutrientKey[] = [
  'fiber',
  'sodium',
  'potassium',
  'magnesium',
  'calcium',
  'phosphorus',
  'iron',
  'zinc',
  'copper',
  'manganese',
  'selenium',
  'vitA',
  'vitC',
  'vitD',
  'vitE',
  'vitK',
  'b1',
  'b2',
  'b3',
  'b6',
  'folate',
  'b12',
  'omega3',
  'sugar',
  'satFat',
];

export function emptyNutrients(): Nutrients {
  return Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, 0])) as Nutrients;
}

export function fillNutrients(partial: Partial<Nutrients> | undefined): Nutrients {
  const n = emptyNutrients();
  if (partial) for (const k of NUTRIENT_KEYS) n[k] = Number(partial[k]) || 0;
  return n;
}

/** a + b × factor, into a new object */
export function addNutrients(a: Nutrients, b: Partial<Nutrients>, factor = 1): Nutrients {
  const out = { ...a };
  for (const k of NUTRIENT_KEYS) out[k] = a[k] + (b[k] ?? 0) * factor;
  return out;
}

/** Per-100 g values → a portion of `grams`. */
export function scaleNutrients(per100: Partial<Nutrients>, grams: number): Nutrients {
  const f = grams / 100;
  const out = emptyNutrients();
  for (const k of NUTRIENT_KEYS) out[k] = Math.round((per100[k] ?? 0) * f * 1000) / 1000;
  return out;
}

export function netCarbsOf(n: Pick<Nutrients, 'carbs' | 'fiber'>): number {
  return Math.max(n.carbs - n.fiber, 0);
}

export function formatAmount(value: number, key: NutrientKey): string {
  const m = NUTRIENT_META[key];
  const decimals = value !== 0 && Math.abs(value) < 1 ? Math.max(m.decimals, 1) : m.decimals;
  return value.toLocaleString(locale(), { maximumFractionDigits: decimals, minimumFractionDigits: 0 });
}

export interface NutrientTarget {
  /** recommended daily amount (RDA/AI) — below ~70 % counts as "не достига" */
  min?: number;
  /** tolerable upper intake / recommended limit — above it counts as "твърде много" */
  max?: number;
  /** compare `max` against this nutrient instead (vitamin A upper limit applies to retinol) */
  maxKey?: NutrientKey;
  note?: string;
}

/**
 * Daily reference values for an adult (US/EU dietary reference intakes: RDA/AI and UL), adjusted for
 * sex, age and the selected diet. Returns null when the nutrient isn't judged for this diet.
 */
export function nutrientTarget(key: NutrientKey, profile: UserProfile | null, diet: Diet, kcalGoal: number): NutrientTarget | null {
  const male = (profile?.sex ?? 'female') === 'male';
  const age = profile?.age ?? 35;
  const kcal = kcalGoal > 0 ? kcalGoal : 2000;
  const ms = (m: number, f: number) => (male ? m : f);

  switch (key) {
    case 'fiber':
      return { min: ms(30, 25) };
    case 'sodium':
      if (diet.electrolytes === 'high') {
        return { min: 3000, max: 7000, note: tr('При кето и гладуване тялото отделя повече натрий — нужни са около 3–5 г на ден.', 'On keto and while fasting the body loses more sodium — you need about 3–5 g a day.') };
      }
      if (diet.id === 'dash') return { max: 1500, note: tr('DASH ограничава натрия до 1500 мг (най-много 2300 мг) на ден.', 'DASH limits sodium to 1500 mg (2300 mg at most) a day.') };
      return { max: 2300, note: tr('Препоръка: до 2300 мг натрий (≈ 5,8 г сол) на ден.', 'Recommended: up to 2300 mg sodium (≈ 5.8 g salt) a day.') };
    case 'potassium':
      return { min: diet.electrolytes === 'high' ? 3500 : ms(3400, 2600) };
    case 'magnesium':
      return { min: male ? (age < 31 ? 400 : 420) : age < 31 ? 310 : 320 };
    case 'calcium':
      return { min: (!male && age > 50) || age > 70 ? 1200 : 1000, max: age > 50 ? 2000 : 2500 };
    case 'phosphorus':
      return { min: 700, max: age > 70 ? 3000 : 4000 };
    case 'iron':
      return { min: male || age > 50 ? 8 : 18, max: 45 };
    case 'zinc':
      return { min: ms(11, 8), max: 40 };
    case 'copper':
      return { min: 0.9, max: 10 };
    case 'manganese':
      return { min: ms(2.3, 1.8), max: 11 };
    case 'selenium':
      return { min: 55, max: 400 };
    case 'vitA':
      return { min: ms(900, 700), max: 3000, maxKey: 'retinol', note: tr('Горната граница (3000 мкг) важи за готовия витамин A от животински храни и добавки.', 'The upper limit (3000 µg) applies to preformed vitamin A from animal foods and supplements.') };
    case 'vitC':
      return { min: ms(90, 75), max: 2000 };
    case 'vitD':
      return { min: age > 70 ? 20 : 15, max: 100, note: tr('Голяма част от витамин D се образува в кожата от слънцето — храната рядко покрива нуждата.', 'Much of your vitamin D is made in the skin from sunlight — food rarely covers the need.') };
    case 'vitE':
      return { min: 15, max: 1000 };
    case 'vitK':
      return { min: ms(120, 90) };
    case 'b1':
      return { min: ms(1.2, 1.1) };
    case 'b2':
      return { min: ms(1.3, 1.1) };
    case 'b3':
      return { min: ms(16, 14) };
    case 'b6':
      return { min: age > 50 ? ms(1.7, 1.5) : 1.3, max: 100 };
    case 'folate':
      return { min: 400 };
    case 'b12':
      return { min: 2.4 };
    case 'omega3':
      return { min: ms(1.6, 1.1) };
    case 'sugar':
      return diet.carbBasis === 'net' ? { max: 25 } : { max: Math.round((kcal * 0.1) / 4), note: tr('Под 10% от калориите. Сметнати са всички захари, вкл. от плодове и мляко.', 'Under 10% of calories. All sugars are counted, incl. from fruit and milk.') };
    case 'satFat':
      if (diet.highFat) return null;
      return { max: Math.round((kcal * 0.1) / 9), note: tr('Под 10% от калориите.', 'Under 10% of calories.') };
    default:
      return null;
  }
}
