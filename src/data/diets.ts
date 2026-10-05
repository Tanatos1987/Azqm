import type { FoodItem, FoodTag } from '@/types';
import { getLang, tr } from '@/i18n';

export type DietId =
  | 'keto'
  | 'uzunov'
  | 'lowcarb'
  | 'lowfat'
  | 'balanced'
  | 'mediterranean'
  | 'zone'
  | 'dash'
  | 'highprotein'
  | 'paleo'
  | 'vegetarian'
  | 'vegan'
  | 'carnivore'
  | 'fasting';

/** How well a food suits a diet — drives the colored dot next to every food. */
export type FoodFit = 'good' | 'ok' | 'avoid';

export interface Diet {
  id: DietId;
  name: string;
  /** one-line summary for lists */
  short: string;
  description: string;
  /** share of calories; sums to 1 (all 0 for therapeutic fasting) */
  split: { protein: number; fat: number; carbs: number };
  /** whether carbs are counted net (minus fiber) or total */
  carbBasis: 'net' | 'total';
  /** hard daily cap on carbs in grams (keto-style diets) */
  carbCapG?: number;
  /** fasting window (hours) suggested when the diet is selected */
  fastingHours?: number;
  /** keto/fasting need more sodium & potassium */
  electrolytes: 'normal' | 'high';
  /** saturated fat is part of the diet — don't flag it as "too much" */
  highFat: boolean;
  /** therapeutic water fasting: no calorie target */
  noCalories?: boolean;
  eat: string[];
  avoid: string[];
  tips: string[];
  warning?: string;
  fit: (food: FoodItem) => FoodFit;
}

/** Pick the Bulgarian or English list for the current language (texts are getters below, so they follow a language switch). */
const pick = <T,>(bg: T, en: T): T => (getLang() === 'en' ? en : bg);

// ---- helpers for the fit rules -------------------------------------------------

const has = (f: FoodItem, ...tags: FoodTag[]) => tags.some((t) => f.tags.includes(t));
const net100 = (f: FoodItem) => Math.max(f.per100.carbs - f.per100.fiber, 0);
const portionGrams = (f: FoodItem) => f.portions[0]?.grams ?? 100;
const netPortion = (f: FoodItem) => (net100(f) * portionGrams(f)) / 100;
/** share of the food's calories coming from protein / fat / carbs */
const energyShare = (f: FoodItem, macro: 'protein' | 'fat' | 'carbs') => {
  const kcal = f.per100.kcal;
  if (kcal <= 0) return 0;
  return ((macro === 'fat' ? 9 : 4) * f.per100[macro]) / kcal;
};
/** water, tea, coffee, a pinch of spice — irrelevant for any diet */
const negligible = (f: FoodItem) => f.per100.kcal < 6 || (f.per100.kcal * portionGrams(f)) / 100 < 6;
const isGrain = (f: FoodItem) => f.category === 'grains' || has(f, 'wg', 'rg');
const isLegume = (f: FoodItem) => f.category === 'legumes' || f.id.includes('peanut');

function ketoFit(f: FoodItem, strictNet: number, okNet: number): FoodFit {
  if (negligible(f)) return 'good';
  if (has(f, 's', 'rg')) return 'avoid';
  const n = net100(f);
  const np = netPortion(f);
  if (n <= strictNet && np <= strictNet + 1) return 'good';
  if (n <= okNet && np <= okNet + 2) return has(f, 'r') ? 'avoid' : 'ok';
  return 'avoid';
}

function unhealthy(f: FoodItem): boolean {
  return has(f, 'uf', 's');
}

// ---- diets --------------------------------------------------------------------------

export const DIETS: Diet[] = [
  {
    id: 'keto',
    get name() {
      return tr('Кето', 'Keto');
    },
    get short() {
      return tr('Много малко въглехидрати, много мазнини — тялото гори мазнини (кетоза).', 'Very low carb, high fat — your body burns fat (ketosis).');
    },
    get description() {
      return tr(
        'Класическа кетогенна диета: около 70% от калориите от мазнини, 25% от протеин и до 5% (20–30 г нетни) въглехидрати. Тялото преминава към изгаряне на мазнини и образуване на кетони.',
        'Classic ketogenic diet: about 70% of calories from fat, 25% from protein and up to 5% (20–30 g net) from carbs. Your body switches to burning fat and producing ketones.',
      );
    },
    split: { protein: 0.25, fat: 0.7, carbs: 0.05 },
    carbBasis: 'net',
    carbCapG: 25,
    electrolytes: 'high',
    highFat: true,
    get eat() {
      return pick(
        ['Месо, риба, яйца', 'Сирена, масло, сметана', 'Зехтин, авокадо, ядки', 'Листни и некорени зеленчуци'],
        ['Meat, fish, eggs', 'Cheese, butter, cream', 'Olive oil, avocado, nuts', 'Leafy and non-root vegetables'],
      );
    },
    get avoid() {
      return pick(
        ['Захар и сладко', 'Хляб, тестени, ориз, паста', 'Картофи и кореноплодни', 'Повечето плодове, бира, сокове'],
        ['Sugar and sweets', 'Bread, pastries, rice, pasta', 'Potatoes and root vegetables', 'Most fruit, beer, juices'],
      );
    },
    get tips() {
      return pick(
        [
          'Пий поне 2–2,5 л вода и добавяй сол — натрий, калий и магнезий предпазват от „кето грип“.',
          'Брои нетните въглехидрати (общо минус фибри).',
          'Първите 3–7 дни може да има умора — минава с адаптацията.',
        ],
        [
          'Drink at least 2–2.5 L of water and add salt — sodium, potassium and magnesium prevent the "keto flu".',
          'Count net carbs (total minus fiber).',
          'You may feel tired for the first 3–7 days — it passes as you adapt.',
        ],
      );
    },
    fit: (f) => ketoFit(f, 5, 10),
  },
  {
    id: 'uzunov',
    get name() {
      return tr('Диетата на Атанас Узунов', "Atanas Uzunov's diet");
    },
    get short() {
      return tr(
        'Нисковъглехидратен режим с естествени мазнини, 2 хранения и периодично гладуване.',
        'Low-carb plan with natural fats, 2 meals a day and intermittent fasting.',
      );
    },
    get description() {
      return tr(
        'Режим, популяризиран от Атанас Узунов: до 20 г нетни въглехидрати дневно, естествени мазнини (40–60% от порцията), без захар, хляб и зърнени. Хранене на обяд и вечеря (12:00–20:00), без закуска, с 1–2 по-дълги гладувания седмично.',
        'A plan popularized by Atanas Uzunov: up to 20 g net carbs a day, natural fats (40–60% of the portion), no sugar, bread or grains. Lunch and dinner only (12:00–20:00), no breakfast, with 1–2 longer fasts a week.',
      );
    },
    split: { protein: 0.3, fat: 0.65, carbs: 0.05 },
    carbBasis: 'net',
    carbCapG: 20,
    fastingHours: 16,
    electrolytes: 'high',
    highFat: true,
    get eat() {
      return pick(
        [
          'Месо, риба (поне веднъж седмично рибен ден), яйца',
          'Естествени мазнини: масло, зехтин, свинска мас, кокосово масло',
          'Зеленчуци, които растат над земята',
          'Узрели сирена и кашкавал, пълномаслено кисело мляко',
          'Горски плодове — умерено',
        ],
        [
          'Meat, fish (a fish day at least once a week), eggs',
          'Natural fats: butter, olive oil, lard, coconut oil',
          'Vegetables that grow above ground',
          'Aged cheeses and kashkaval, full-fat yogurt',
          'Berries — in moderation',
        ],
      );
    },
    get avoid() {
      return pick(
        [
          'Захар, сладкиши, подсладители',
          'Хляб, тестени, ориз, царевица и всички зърнени',
          'Картофи, моркови, цвекло и други кореноплодни',
          'Бобови и повечето плодове, фреш сокове',
          'Рафинирани олиа и маргарин, алкохол',
        ],
        [
          'Sugar, sweets, sweeteners',
          'Bread, pastries, rice, corn and all grains',
          'Potatoes, carrots, beets and other root vegetables',
          'Legumes and most fruit, fresh juices',
          'Refined oils and margarine, alcohol',
        ],
      );
    },
    get tips() {
      return pick(
        [
          'Две хранения: обяд (след 12:00) и вечеря (до 20:00). Сутрин — кафе или чай (по желание „бронирано кафе“).',
          'Веднъж-два пъти седмично — гладуване 24 часа (раздел „Пост“).',
          'Комбинирай месо или риба със зеленчуци на всяко хранене.',
        ],
        [
          'Two meals: lunch (after 12:00) and dinner (by 20:00). In the morning — coffee or tea (optionally "bulletproof coffee").',
          'Once or twice a week — a 24-hour fast (the "Fasting" tab).',
          'Pair meat or fish with vegetables at every meal.',
        ],
      );
    },
    get warning() {
      return tr(
        'Режимът е авторски и не е официална медицинска препоръка. При хронични заболявания се консултирай с лекар.',
        "This is the author's own plan, not an official medical recommendation. If you have a chronic condition, talk to your doctor.",
      );
    },
    fit: (f) => {
      if (negligible(f)) return has(f, 's') ? 'avoid' : 'good';
      if (has(f, 'r', 'rg', 'wg', 's', 'po', 'uf') || isGrain(f) || isLegume(f) || f.category === 'alcohol') return 'avoid';
      if (f.category === 'fruits' && !has(f, 'b') && net100(f) > 5) return 'avoid';
      return ketoFit(f, 5, 10);
    },
  },
  {
    id: 'lowcarb',
    get name() {
      return tr('Нисковъглехидратна', 'Low carb');
    },
    get short() {
      return tr('Умерено ниски въглехидрати (≈20%), повече протеин и мазнини.', 'Moderately low carbs (≈20%), more protein and fat.');
    },
    get description() {
      return tr(
        'По-мек вариант на кето: около 20% от калориите от въглехидрати (обикновено 50–130 г на ден), 30% протеин и 50% мазнини. Подходяща за отслабване и по-стабилна кръвна захар без строга кетоза.',
        'A gentler take on keto: about 20% of calories from carbs (usually 50–130 g a day), 30% protein and 50% fat. Good for weight loss and steadier blood sugar without strict ketosis.',
      );
    },
    split: { protein: 0.3, fat: 0.5, carbs: 0.2 },
    carbBasis: 'net',
    electrolytes: 'normal',
    highFat: true,
    get eat() {
      return pick(
        ['Месо, риба, яйца, млечни', 'Зеленчуци в изобилие', 'Ядки, семена, зехтин', 'Плодове с ниско съдържание на захар'],
        ['Meat, fish, eggs, dairy', 'Plenty of vegetables', 'Nuts, seeds, olive oil', 'Low-sugar fruit'],
      );
    },
    get avoid() {
      return pick(
        ['Захар, сладкиши, газирани напитки', 'Бял хляб и тестени', 'Големи порции ориз, паста, картофи'],
        ['Sugar, sweets, soft drinks', 'White bread and pastries', 'Large portions of rice, pasta, potatoes'],
      );
    },
    get tips() {
      return pick(
        ['Ако ядеш въглехидрати, избирай пълнозърнести и бобови в малки порции.', 'Комбинирай въглехидратите с протеин и фибри.'],
        ['When you eat carbs, pick whole grains and legumes in small portions.', 'Pair carbs with protein and fiber.'],
      );
    },
    fit: (f) => {
      if (negligible(f)) return 'good';
      if (has(f, 's') || net100(f) > 30) return 'avoid';
      if (net100(f) > 12 || has(f, 'rg')) return 'ok';
      return unhealthy(f) ? 'ok' : 'good';
    },
  },
  {
    id: 'lowfat',
    get name() {
      return tr('Нискомазнинна', 'Low fat');
    },
    get short() {
      return tr('Мазнините до ~20% от калориите; повече зърнени, плодове и зеленчуци.', 'Fat up to ~20% of calories; more grains, fruit and vegetables.');
    },
    get description() {
      return tr(
        'Ограничава мазнините до около 20% от калориите (за някои здравни състояния — жлъчка, панкреас, холестерол), с 20% протеин и 60% въглехидрати, предимно от пълнозърнести храни, плодове и зеленчуци.',
        'Limits fat to about 20% of calories (for some health conditions — gallbladder, pancreas, cholesterol), with 20% protein and 60% carbs, mostly from whole grains, fruit and vegetables.',
      );
    },
    split: { protein: 0.2, fat: 0.2, carbs: 0.6 },
    carbBasis: 'total',
    electrolytes: 'normal',
    highFat: false,
    get eat() {
      return pick(
        ['Зеленчуци и плодове', 'Пълнозърнести храни, бобови', 'Постно месо, риба, белтъци', 'Нискомаслени млечни'],
        ['Vegetables and fruit', 'Whole grains, legumes', 'Lean meat, fish, egg whites', 'Low-fat dairy'],
      );
    },
    get avoid() {
      return pick(
        ['Пържени храни', 'Тлъсто месо, колбаси', 'Масло, сметана, пълномаслени сирена', 'Сладкиши с много мазнини'],
        ['Fried foods', 'Fatty meat, sausages', 'Butter, cream, full-fat cheese', 'High-fat sweets'],
      );
    },
    get tips() {
      return pick(
        ['Готви на пара, печи или вари вместо да пържиш.', 'Чети етикетите — „светли“ продукти често имат добавена захар.'],
        ['Steam, bake or boil instead of frying.', 'Read labels — "light" products often have added sugar.'],
      );
    },
    fit: (f) => {
      if (negligible(f)) return 'good';
      if (has(f, 'fr')) return 'avoid';
      const fe = energyShare(f, 'fat');
      if (fe > 0.45) return 'avoid';
      if (fe > 0.28 || unhealthy(f)) return 'ok';
      return 'good';
    },
  },
  {
    id: 'balanced',
    get name() {
      return tr('Балансирана', 'Balanced');
    },
    get short() {
      return tr('Разнообразно хранене по официалните препоръки (50/30/20).', 'Varied eating following the official guidelines (50/30/20).');
    },
    get description() {
      return tr(
        'Хранене по общите препоръки на СЗО и EFSA: около 50% въглехидрати (предимно пълнозърнести), 30% мазнини и 20% протеин, много зеленчуци и плодове, малко захар и сол.',
        'Eating by the general WHO and EFSA guidelines: about 50% carbs (mostly whole grain), 30% fat and 20% protein, lots of vegetables and fruit, little sugar and salt.',
      );
    },
    split: { protein: 0.2, fat: 0.3, carbs: 0.5 },
    carbBasis: 'total',
    electrolytes: 'normal',
    highFat: false,
    get eat() {
      return pick(
        ['Поне 400 г зеленчуци и плодове дневно', 'Пълнозърнести храни', 'Риба 2 пъти седмично, бобови', 'Ядки, зехтин'],
        ['At least 400 g of vegetables and fruit a day', 'Whole grains', 'Fish twice a week, legumes', 'Nuts, olive oil'],
      );
    },
    get avoid() {
      return pick(
        ['Много захар и сладки напитки', 'Много сол и колбаси', 'Ултрапреработени храни'],
        ['Lots of sugar and sweet drinks', 'Lots of salt and sausages', 'Ultra-processed foods'],
      );
    },
    get tips() {
      return pick(
        ['Половината чиния — зеленчуци, четвърт — протеин, четвърт — пълнозърнести.', 'Добавената захар — под 10% от калориите.'],
        ['Half the plate vegetables, a quarter protein, a quarter whole grains.', 'Keep added sugar under 10% of calories.'],
      );
    },
    fit: (f) => {
      if (negligible(f)) return 'good';
      if (has(f, 'uf', 's', 'pm', 'fr') || f.category === 'alcohol') return 'ok';
      return 'good';
    },
  },
  {
    id: 'mediterranean',
    get name() {
      return tr('Средиземноморска', 'Mediterranean');
    },
    get short() {
      return tr(
        'Зехтин, риба, зеленчуци, бобови и пълнозърнести — с най-много доказани ползи.',
        'Olive oil, fish, vegetables, legumes and whole grains — the most proven benefits.',
      );
    },
    get description() {
      return tr(
        'Традиционното хранене около Средиземно море: много зеленчуци, плодове, бобови, ядки и пълнозърнести храни, зехтин като основна мазнина, риба поне 2 пъти седмично, умерено млечни и птиче месо, малко червено месо и сладко. Около 45% въглехидрати, 37% мазнини, 18% протеин.',
        'The traditional way of eating around the Mediterranean: lots of vegetables, fruit, legumes, nuts and whole grains, olive oil as the main fat, fish at least twice a week, moderate dairy and poultry, little red meat and sweets. About 45% carbs, 37% fat, 18% protein.',
      );
    },
    split: { protein: 0.18, fat: 0.37, carbs: 0.45 },
    carbBasis: 'total',
    electrolytes: 'normal',
    highFat: false,
    get eat() {
      return pick(
        ['Зехтин всеки ден', 'Риба и морски дарове 2–3 пъти седмично', 'Зеленчуци, плодове, бобови', 'Ядки, семена, пълнозърнести', 'Кисело мляко и сирене умерено'],
        ['Olive oil every day', 'Fish and seafood 2–3 times a week', 'Vegetables, fruit, legumes', 'Nuts, seeds, whole grains', 'Yogurt and cheese in moderation'],
      );
    },
    get avoid() {
      return pick(
        ['Колбаси и преработено месо', 'Сладкиши и газирани напитки', 'Рафинирани зърнени', 'Червено месо — до няколко пъти месечно'],
        ['Sausages and processed meat', 'Sweets and soft drinks', 'Refined grains', 'Red meat — no more than a few times a month'],
      );
    },
    get tips() {
      return pick(
        ['Използвай зехтин вместо масло и олио.', 'Чаша червено вино с храна е допустима, но не е задължителна.'],
        ['Use olive oil instead of butter and vegetable oil.', 'A glass of red wine with a meal is fine, but not required.'],
      );
    },
    fit: (f) => {
      if (negligible(f)) return 'good';
      if (has(f, 'pm', 'uf', 's')) return 'avoid';
      if (f.category === 'alcohol') return f.id.includes('wine') ? 'ok' : 'avoid';
      if (has(f, 'rm', 'rg', 'fr', 'po')) return 'ok';
      if (f.category === 'fats' && !f.id.includes('olive')) return 'ok';
      return 'good';
    },
  },
  {
    id: 'zone',
    get name() {
      return tr('Зоната (40/30/30)', 'The Zone (40/30/30)');
    },
    get short() {
      return tr('Всяко хранене: 40% въглехидрати, 30% протеин, 30% мазнини.', 'Every meal: 40% carbs, 30% protein, 30% fat.');
    },
    get description() {
      return tr(
        'Диетата „Зоната“ на д-р Бари Сиърс: всяко хранене съдържа 40% въглехидрати с нисък гликемичен индекс, 30% постен протеин и 30% предимно мононенаситени мазнини. Обикновено 3 хранения и 2 малки закуски, без да минават повече от 5 часа без храна.',
        "Dr. Barry Sears' Zone diet: every meal has 40% low-glycemic carbs, 30% lean protein and 30% mostly monounsaturated fat. Usually 3 meals and 2 small snacks, never more than 5 hours without food.",
      );
    },
    split: { protein: 0.3, fat: 0.3, carbs: 0.4 },
    carbBasis: 'total',
    electrolytes: 'normal',
    highFat: false,
    get eat() {
      return pick(
        ['Постно месо, риба, яйца, извара — колкото дланта', 'Зеленчуци и плодове с нисък ГИ', 'Зехтин, авокадо, бадеми'],
        ['Lean meat, fish, eggs, cottage cheese — a palm-sized portion', 'Low-GI vegetables and fruit', 'Olive oil, avocado, almonds'],
      );
    },
    get avoid() {
      return pick(['Захар, бял хляб, бял ориз, картофи', 'Тлъсто месо', 'Сладки напитки'], ['Sugar, white bread, white rice, potatoes', 'Fatty meat', 'Sweet drinks']);
    },
    get tips() {
      return pick(
        ['Чинията: 1/3 протеин, 2/3 зеленчуци и плодове, малко полезна мазнина.', 'Не пропускай хранения — яж на 4–5 часа.'],
        ['Your plate: 1/3 protein, 2/3 vegetables and fruit, a little healthy fat.', "Don't skip meals — eat every 4–5 hours."],
      );
    },
    fit: (f) => {
      if (negligible(f)) return 'good';
      if (has(f, 's', 'uf')) return 'avoid';
      if (has(f, 'rg', 'r', 'fr', 'pm')) return 'ok';
      if (energyShare(f, 'fat') > 0.6 && f.category !== 'fats' && f.category !== 'nuts') return 'ok';
      return 'good';
    },
  },
  {
    id: 'dash',
    get name() {
      return tr('DASH (при високо кръвно)', 'DASH (for high blood pressure)');
    },
    get short() {
      return tr('Малко сол, много зеленчуци, плодове и нискомаслени млечни.', 'Little salt, lots of vegetables, fruit and low-fat dairy.');
    },
    get description() {
      return tr(
        'Диетата DASH е създадена за понижаване на кръвното налягане: натрий до 1500–2300 мг дневно, много калий, магнезий и калций от зеленчуци, плодове, бобови, ядки и нискомаслени млечни, пълнозърнести храни, малко червено месо и сладко.',
        'The DASH diet was designed to lower blood pressure: sodium up to 1500–2300 mg a day, plenty of potassium, magnesium and calcium from vegetables, fruit, legumes, nuts and low-fat dairy, whole grains, little red meat and sweets.',
      );
    },
    split: { protein: 0.18, fat: 0.27, carbs: 0.55 },
    carbBasis: 'total',
    electrolytes: 'normal',
    highFat: false,
    get eat() {
      return pick(
        ['4–5 порции зеленчуци и 4–5 порции плодове', 'Пълнозърнести', 'Нискомаслени млечни', 'Риба, птиче, бобови, ядки (несолени)'],
        ['4–5 servings of vegetables and 4–5 servings of fruit', 'Whole grains', 'Low-fat dairy', 'Fish, poultry, legumes, nuts (unsalted)'],
      );
    },
    get avoid() {
      return pick(
        ['Сол, колбаси, саламурени сирена, туршии', 'Готови сосове и супи', 'Сладкиши, сладки напитки'],
        ['Salt, sausages, brined cheeses, pickles', 'Ready-made sauces and soups', 'Sweets, sweet drinks'],
      );
    },
    get tips() {
      return pick(
        ['Овкусявай с билки и лимон вместо сол.', 'Следи натрия в раздел „Анализ“.'],
        ['Season with herbs and lemon instead of salt.', 'Keep an eye on sodium in the "Analysis" tab.'],
      );
    },
    fit: (f) => {
      if (negligible(f)) return f.per100.sodium > 1000 ? 'avoid' : 'good';
      const naPerPortion = (f.per100.sodium * portionGrams(f)) / 100;
      if (has(f, 'pm', 's') || f.per100.sodium > 800 || naPerPortion > 700) return 'avoid';
      if (f.per100.sodium > 400 || naPerPortion > 400 || has(f, 'uf', 'fr', 'rm')) return 'ok';
      return 'good';
    },
  },
  {
    id: 'highprotein',
    get name() {
      return tr('Високопротеинова', 'High protein');
    },
    get short() {
      return tr('Повече протеин (≈35%) за ситост, мускули и отслабване.', 'More protein (≈35%) for fullness, muscle and weight loss.');
    },
    get description() {
      return tr(
        'Около 35% от калориите от протеин (1,6–2,2 г на кг тегло), 30% мазнини и 35% въглехидрати. Подходяща при тренировки и отслабване — протеинът засища и пази мускулите.',
        'About 35% of calories from protein (1.6–2.2 g per kg of body weight), 30% fat and 35% carbs. Good for training and weight loss — protein keeps you full and protects muscle.',
      );
    },
    split: { protein: 0.35, fat: 0.3, carbs: 0.35 },
    carbBasis: 'total',
    electrolytes: 'normal',
    highFat: false,
    get eat() {
      return pick(
        ['Пилешко, пуешко, риба, яйца', 'Извара, гръцко кисело мляко, сирене', 'Бобови, тофу', 'Зеленчуци'],
        ['Chicken, turkey, fish, eggs', 'Cottage cheese, Greek yogurt, cheese', 'Legumes, tofu', 'Vegetables'],
      );
    },
    get avoid() {
      return pick(
        ['Сладкиши и сладки напитки', 'Тестени без протеин', 'Ултрапреработени храни'],
        ['Sweets and sweet drinks', 'Low-protein pastries', 'Ultra-processed foods'],
      );
    },
    get tips() {
      return pick(['Разпредели протеина в 3–4 хранения по 25–40 г.', 'Пий достатъчно вода.'], ['Spread protein over 3–4 meals of 25–40 g each.', 'Drink enough water.']);
    },
    fit: (f) => {
      if (negligible(f)) return 'good';
      if (unhealthy(f)) return 'avoid';
      if (energyShare(f, 'protein') >= 0.25) return 'good';
      if (f.category === 'vegetables' || f.category === 'fruits' || f.category === 'legumes') return 'good';
      return 'ok';
    },
  },
  {
    id: 'paleo',
    get name() {
      return tr('Палео', 'Paleo');
    },
    get short() {
      return tr('Храни „като нашите предци“: месо, риба, зеленчуци, плодове, ядки.', 'Eat "like our ancestors": meat, fish, vegetables, fruit, nuts.');
    },
    get description() {
      return tr(
        'Палео диетата изключва зърнени, бобови, млечни, захар и преработени храни. Основата е месо, риба, яйца, зеленчуци, плодове, ядки и семена. Приблизително 30% протеин, 40% мазнини, 30% въглехидрати.',
        'The paleo diet cuts out grains, legumes, dairy, sugar and processed foods. It is built on meat, fish, eggs, vegetables, fruit, nuts and seeds. Roughly 30% protein, 40% fat, 30% carbs.',
      );
    },
    split: { protein: 0.3, fat: 0.4, carbs: 0.3 },
    carbBasis: 'total',
    electrolytes: 'normal',
    highFat: true,
    get eat() {
      return pick(
        ['Месо, риба, яйца', 'Зеленчуци и плодове', 'Ядки и семена', 'Зехтин, кокосово масло, авокадо'],
        ['Meat, fish, eggs', 'Vegetables and fruit', 'Nuts and seeds', 'Olive oil, coconut oil, avocado'],
      );
    },
    get avoid() {
      return pick(
        ['Зърнени и хляб', 'Бобови (вкл. фъстъци)', 'Млечни продукти', 'Захар, рафинирани олиа, преработени храни'],
        ['Grains and bread', 'Legumes (incl. peanuts)', 'Dairy products', 'Sugar, refined oils, processed foods'],
      );
    },
    get tips() {
      return pick(
        ['Избирай месо от животни на свободна паша, когато можеш.', 'Сладките картофи са допустим източник на въглехидрати.'],
        ['Choose meat from pasture-raised animals when you can.', 'Sweet potatoes are an acceptable carb source.'],
      );
    },
    fit: (f) => {
      if (negligible(f)) return 'good';
      if (isGrain(f) || isLegume(f) || has(f, 's', 'uf', 'po') || f.category === 'alcohol') return 'avoid';
      if (has(f, 'd')) return f.id.includes('ghee') || f.id.includes('butter') ? 'ok' : 'avoid';
      if (has(f, 'pm', 'fr')) return 'ok';
      return 'good';
    },
  },
  {
    id: 'vegetarian',
    get name() {
      return tr('Вегетарианска', 'Vegetarian');
    },
    get short() {
      return tr('Без месо и риба; с яйца и млечни продукти.', 'No meat or fish; eggs and dairy are fine.');
    },
    get description() {
      return tr(
        'Изключва месо, птици и риба. Протеинът идва от яйца, млечни, бобови, ядки и тофу. Внимание към желязо, B12 и омега-3.',
        'Excludes meat, poultry and fish. Protein comes from eggs, dairy, legumes, nuts and tofu. Watch your iron, B12 and omega-3.',
      );
    },
    split: { protein: 0.18, fat: 0.32, carbs: 0.5 },
    carbBasis: 'total',
    electrolytes: 'normal',
    highFat: false,
    get eat() {
      return pick(
        ['Яйца, кисело мляко, сирене', 'Бобови, тофу, темпе', 'Пълнозърнести', 'Зеленчуци, плодове, ядки, семена'],
        ['Eggs, yogurt, cheese', 'Legumes, tofu, tempeh', 'Whole grains', 'Vegetables, fruit, nuts, seeds'],
      );
    },
    get avoid() {
      return pick(['Месо и птици', 'Риба и морски дарове', 'Желатин и бульони от месо'], ['Meat and poultry', 'Fish and seafood', 'Gelatin and meat broths']);
    },
    get tips() {
      return pick(
        ['Комбинирай бобови и зърнени за пълноценен протеин.', 'Витамин C (чушки, цитрусови) подобрява усвояването на желязото.'],
        ['Combine legumes and grains for complete protein.', 'Vitamin C (peppers, citrus) improves iron absorption.'],
      );
    },
    fit: (f) => {
      if (has(f, 'm', 'f', 'pm')) return 'avoid';
      if (negligible(f)) return 'good';
      return unhealthy(f) ? 'ok' : 'good';
    },
  },
  {
    id: 'vegan',
    get name() {
      return tr('Веганска', 'Vegan');
    },
    get short() {
      return tr('Само растителни храни — без месо, риба, яйца, млечни и мед.', 'Plant foods only — no meat, fish, eggs, dairy or honey.');
    },
    get description() {
      return tr(
        'Изцяло растително хранене. Задължителен е източник на витамин B12 (добавка или обогатени храни); внимание към витамин D, омега-3, желязо, цинк, калций и йод.',
        'Fully plant-based eating. A source of vitamin B12 is a must (a supplement or fortified foods); watch your vitamin D, omega-3, iron, zinc, calcium and iodine.',
      );
    },
    split: { protein: 0.15, fat: 0.3, carbs: 0.55 },
    carbBasis: 'total',
    electrolytes: 'normal',
    highFat: false,
    get eat() {
      return pick(
        ['Бобови, тофу, темпе', 'Пълнозърнести', 'Зеленчуци, плодове', 'Ядки, семена, ленено семе, чиа'],
        ['Legumes, tofu, tempeh', 'Whole grains', 'Vegetables, fruit', 'Nuts, seeds, flaxseed, chia'],
      );
    },
    get avoid() {
      return pick(['Месо, риба, морски дарове', 'Яйца, мляко, сирене, масло', 'Мед, желатин'], ['Meat, fish, seafood', 'Eggs, milk, cheese, butter', 'Honey, gelatin']);
    },
    get tips() {
      return pick(
        ['Приемай витамин B12 като добавка — от растенията не се набавя.', 'Ленено семе, чиа и орехи дават растителна омега-3.'],
        ["Take vitamin B12 as a supplement — you can't get it from plants.", 'Flaxseed, chia and walnuts provide plant omega-3.'],
      );
    },
    get warning() {
      return tr('Без добавка на витамин B12 веганското хранене води до дефицит.', 'Without a vitamin B12 supplement, a vegan diet leads to deficiency.');
    },
    fit: (f) => {
      if (has(f, 'm', 'f', 'pm', 'd', 'e', 'h')) return 'avoid';
      if (negligible(f)) return 'good';
      return unhealthy(f) ? 'ok' : 'good';
    },
  },
  {
    id: 'carnivore',
    get name() {
      return tr('Карнивор', 'Carnivore');
    },
    get short() {
      return tr('Само животински храни: месо, риба, яйца, малко млечни.', 'Animal foods only: meat, fish, eggs, a little dairy.');
    },
    get description() {
      return tr(
        'Крайна форма на нисковъглехидратно хранене — почти нулеви въглехидрати, само храни от животински произход. Няма дългосрочни изследвания за безопасност.',
        'An extreme form of low-carb eating — almost zero carbs, only foods of animal origin. There are no long-term safety studies.',
      );
    },
    split: { protein: 0.35, fat: 0.65, carbs: 0 },
    carbBasis: 'net',
    carbCapG: 10,
    electrolytes: 'high',
    highFat: true,
    get eat() {
      return pick(
        ['Говеждо, свинско, агнешко, карантии', 'Риба, яйца', 'Масло, мас', 'Твърди сирена (по желание)'],
        ['Beef, pork, lamb, organ meats', 'Fish, eggs', 'Butter, lard', 'Hard cheeses (optional)'],
      );
    },
    get avoid() {
      return pick(['Всички растителни храни', 'Захар, зърнени, плодове', 'Растителни масла'], ['All plant foods', 'Sugar, grains, fruit', 'Vegetable oils']);
    },
    get tips() {
      return pick(
        ['Карантиите (дроб) покриват витамини, които липсват при чисто месо.', 'Следи натрия и калия.'],
        ['Organ meats (liver) cover vitamins that plain meat lacks.', 'Keep an eye on sodium and potassium.'],
      );
    },
    get warning() {
      return tr(
        'Режимът няма фибри и почти няма витамин C. Не се препоръчва дългосрочно без лекарско наблюдение.',
        'This diet has no fiber and almost no vitamin C. Not recommended long term without medical supervision.',
      );
    },
    fit: (f) => {
      if (negligible(f)) return 'good';
      if (has(f, 'm', 'f', 'e')) return net100(f) > 5 || has(f, 's') ? 'ok' : 'good';
      if (has(f, 'd')) return net100(f) <= 4 ? 'ok' : 'avoid';
      return 'avoid';
    },
  },
  {
    id: 'fasting',
    get name() {
      return tr('Лечебно гладуване', 'Therapeutic fasting');
    },
    get short() {
      return tr('Само вода (и електролити) за определен период.', 'Only water (and electrolytes) for a set period.');
    },
    get description() {
      return tr(
        'Водно гладуване — без храна, само вода, неподсладен чай и електролити, обикновено 24–72 часа. Таймерът е в раздел „Пост“. След гладуването храната се въвежда постепенно (бульон, зеленчуци, малки порции).',
        'Water fasting — no food, only water, unsweetened tea and electrolytes, usually for 24–72 hours. The timer is in the "Fasting" tab. After the fast, bring food back gradually (broth, vegetables, small portions).',
      );
    },
    split: { protein: 0, fat: 0, carbs: 0 },
    carbBasis: 'net',
    fastingHours: 24,
    electrolytes: 'high',
    highFat: true,
    noCalories: true,
    get eat() {
      return pick(
        ['Вода: 2–3 л на ден', 'Минерална вода, неподсладен билков чай', 'Сол (натрий), калий и магнезий'],
        ['Water: 2–3 L a day', 'Mineral water, unsweetened herbal tea', 'Salt (sodium), potassium and magnesium'],
      );
    },
    get avoid() {
      return pick(
        ['Всякаква храна и калорични напитки', 'Тежки физически натоварвания', 'Рязко хранене след края — започни с бульон'],
        ['Any food and caloric drinks', 'Heavy physical exertion', 'Eating a big meal right after — start with broth'],
      );
    },
    get tips() {
      return pick(
        [
          'Добавяй щипка сол във водата и приемай магнезий — предпазва от главоболие и крампи.',
          'Ставай бавно — може да се появи замайване.',
          'Прекъсни гладуването при силна слабост, сърцебиене или прилошаване.',
        ],
        [
          'Add a pinch of salt to your water and take magnesium — it prevents headaches and cramps.',
          'Stand up slowly — you may feel dizzy.',
          'Stop the fast if you feel very weak, have palpitations or feel faint.',
        ],
      );
    },
    get warning() {
      return tr(
        'Гладуване над 24–48 часа — само след консултация с лекар. Не гладувай при бременност и кърмене, диабет на инсулин или таблетки, хранителни разстройства, поднормено тегло, сърдечни, бъбречни заболявания, подагра, или под 18 години.',
        "Fasting longer than 24–48 hours — only after talking to a doctor. Don't fast if you are pregnant or breastfeeding, have diabetes treated with insulin or pills, an eating disorder, are underweight, have heart or kidney disease, gout, or are under 18.",
      );
    },
    fit: (f) => (negligible(f) && !has(f, 's') ? 'good' : f.id.includes('broth') ? 'ok' : 'avoid'),
  },
];

const DIETS_BY_ID = new Map(DIETS.map((d) => [d.id, d]));

export function getDiet(id: string | null | undefined): Diet {
  return DIETS_BY_ID.get(id as DietId) ?? DIETS[0];
}

export const FIT_LABEL: Record<FoodFit, string> = {
  get good() {
    return tr('Подходяща', 'Good fit');
  },
  get ok() {
    return tr('Умерено', 'In moderation');
  },
  get avoid() {
    return tr('Избягвай', 'Avoid');
  },
};
