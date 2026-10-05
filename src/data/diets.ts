import type { FoodItem, FoodTag } from '@/types';

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
    name: 'Кето',
    short: 'Много малко въглехидрати, много мазнини — тялото гори мазнини (кетоза).',
    description:
      'Класическа кетогенна диета: около 70% от калориите от мазнини, 25% от протеин и до 5% (20–30 г нетни) въглехидрати. Тялото преминава към изгаряне на мазнини и образуване на кетони.',
    split: { protein: 0.25, fat: 0.7, carbs: 0.05 },
    carbBasis: 'net',
    carbCapG: 25,
    electrolytes: 'high',
    highFat: true,
    eat: ['Месо, риба, яйца', 'Сирена, масло, сметана', 'Зехтин, авокадо, ядки', 'Листни и некорени зеленчуци'],
    avoid: ['Захар и сладко', 'Хляб, тестени, ориз, паста', 'Картофи и кореноплодни', 'Повечето плодове, бира, сокове'],
    tips: [
      'Пий поне 2–2,5 л вода и добавяй сол — натрий, калий и магнезий предпазват от „кето грип“.',
      'Брои нетните въглехидрати (общо минус фибри).',
      'Първите 3–7 дни може да има умора — минава с адаптацията.',
    ],
    fit: (f) => ketoFit(f, 5, 10),
  },
  {
    id: 'uzunov',
    name: 'Диетата на Атанас Узунов',
    short: 'Нисковъглехидратен режим с естествени мазнини, 2 хранения и периодично гладуване.',
    description:
      'Режим, популяризиран от Атанас Узунов: до 20 г нетни въглехидрати дневно, естествени мазнини (40–60% от порцията), без захар, хляб и зърнени. Хранене на обяд и вечеря (12:00–20:00), без закуска, с 1–2 по-дълги гладувания седмично.',
    split: { protein: 0.3, fat: 0.65, carbs: 0.05 },
    carbBasis: 'net',
    carbCapG: 20,
    fastingHours: 16,
    electrolytes: 'high',
    highFat: true,
    eat: [
      'Месо, риба (поне веднъж седмично рибен ден), яйца',
      'Естествени мазнини: масло, зехтин, свинска мас, кокосово масло',
      'Зеленчуци, които растат над земята',
      'Узрели сирена и кашкавал, пълномаслено кисело мляко',
      'Горски плодове — умерено',
    ],
    avoid: [
      'Захар, сладкиши, подсладители',
      'Хляб, тестени, ориз, царевица и всички зърнени',
      'Картофи, моркови, цвекло и други кореноплодни',
      'Бобови и повечето плодове, фреш сокове',
      'Рафинирани олиа и маргарин, алкохол',
    ],
    tips: [
      'Две хранения: обяд (след 12:00) и вечеря (до 20:00). Сутрин — кафе или чай (по желание „бронирано кафе“).',
      'Веднъж-два пъти седмично — гладуване 24 часа (раздел „Пост“).',
      'Комбинирай месо или риба със зеленчуци на всяко хранене.',
    ],
    warning: 'Режимът е авторски и не е официална медицинска препоръка. При хронични заболявания се консултирай с лекар.',
    fit: (f) => {
      if (negligible(f)) return has(f, 's') ? 'avoid' : 'good';
      if (has(f, 'r', 'rg', 'wg', 's', 'po', 'uf') || isGrain(f) || isLegume(f) || f.category === 'alcohol') return 'avoid';
      if (f.category === 'fruits' && !has(f, 'b') && net100(f) > 5) return 'avoid';
      return ketoFit(f, 5, 10);
    },
  },
  {
    id: 'lowcarb',
    name: 'Нисковъглехидратна',
    short: 'Умерено ниски въглехидрати (≈20%), повече протеин и мазнини.',
    description:
      'По-мек вариант на кето: около 20% от калориите от въглехидрати (обикновено 50–130 г на ден), 30% протеин и 50% мазнини. Подходяща за отслабване и по-стабилна кръвна захар без строга кетоза.',
    split: { protein: 0.3, fat: 0.5, carbs: 0.2 },
    carbBasis: 'net',
    electrolytes: 'normal',
    highFat: true,
    eat: ['Месо, риба, яйца, млечни', 'Зеленчуци в изобилие', 'Ядки, семена, зехтин', 'Плодове с ниско съдържание на захар'],
    avoid: ['Захар, сладкиши, газирани напитки', 'Бял хляб и тестени', 'Големи порции ориз, паста, картофи'],
    tips: ['Ако ядеш въглехидрати, избирай пълнозърнести и бобови в малки порции.', 'Комбинирай въглехидратите с протеин и фибри.'],
    fit: (f) => {
      if (negligible(f)) return 'good';
      if (has(f, 's') || net100(f) > 30) return 'avoid';
      if (net100(f) > 12 || has(f, 'rg')) return 'ok';
      return unhealthy(f) ? 'ok' : 'good';
    },
  },
  {
    id: 'lowfat',
    name: 'Нискомазнинна',
    short: 'Мазнините до ~20% от калориите; повече зърнени, плодове и зеленчуци.',
    description:
      'Ограничава мазнините до около 20% от калориите (за някои здравни състояния — жлъчка, панкреас, холестерол), с 20% протеин и 60% въглехидрати, предимно от пълнозърнести храни, плодове и зеленчуци.',
    split: { protein: 0.2, fat: 0.2, carbs: 0.6 },
    carbBasis: 'total',
    electrolytes: 'normal',
    highFat: false,
    eat: ['Зеленчуци и плодове', 'Пълнозърнести храни, бобови', 'Постно месо, риба, белтъци', 'Нискомаслени млечни'],
    avoid: ['Пържени храни', 'Тлъсто месо, колбаси', 'Масло, сметана, пълномаслени сирена', 'Сладкиши с много мазнини'],
    tips: ['Готви на пара, печи или вари вместо да пържиш.', 'Чети етикетите — „светли“ продукти често имат добавена захар.'],
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
    name: 'Балансирана',
    short: 'Разнообразно хранене по официалните препоръки (50/30/20).',
    description:
      'Хранене по общите препоръки на СЗО и EFSA: около 50% въглехидрати (предимно пълнозърнести), 30% мазнини и 20% протеин, много зеленчуци и плодове, малко захар и сол.',
    split: { protein: 0.2, fat: 0.3, carbs: 0.5 },
    carbBasis: 'total',
    electrolytes: 'normal',
    highFat: false,
    eat: ['Поне 400 г зеленчуци и плодове дневно', 'Пълнозърнести храни', 'Риба 2 пъти седмично, бобови', 'Ядки, зехтин'],
    avoid: ['Много захар и сладки напитки', 'Много сол и колбаси', 'Ултрапреработени храни'],
    tips: ['Половината чиния — зеленчуци, четвърт — протеин, четвърт — пълнозърнести.', 'Добавената захар — под 10% от калориите.'],
    fit: (f) => {
      if (negligible(f)) return 'good';
      if (has(f, 'uf', 's', 'pm', 'fr') || f.category === 'alcohol') return 'ok';
      return 'good';
    },
  },
  {
    id: 'mediterranean',
    name: 'Средиземноморска',
    short: 'Зехтин, риба, зеленчуци, бобови и пълнозърнести — с най-много доказани ползи.',
    description:
      'Традиционното хранене около Средиземно море: много зеленчуци, плодове, бобови, ядки и пълнозърнести храни, зехтин като основна мазнина, риба поне 2 пъти седмично, умерено млечни и птиче месо, малко червено месо и сладко. Около 45% въглехидрати, 37% мазнини, 18% протеин.',
    split: { protein: 0.18, fat: 0.37, carbs: 0.45 },
    carbBasis: 'total',
    electrolytes: 'normal',
    highFat: false,
    eat: ['Зехтин всеки ден', 'Риба и морски дарове 2–3 пъти седмично', 'Зеленчуци, плодове, бобови', 'Ядки, семена, пълнозърнести', 'Кисело мляко и сирене умерено'],
    avoid: ['Колбаси и преработено месо', 'Сладкиши и газирани напитки', 'Рафинирани зърнени', 'Червено месо — до няколко пъти месечно'],
    tips: ['Използвай зехтин вместо масло и олио.', 'Чаша червено вино с храна е допустима, но не е задължителна.'],
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
    name: 'Зоната (40/30/30)',
    short: 'Всяко хранене: 40% въглехидрати, 30% протеин, 30% мазнини.',
    description:
      'Диетата „Зоната“ на д-р Бари Сиърс: всяко хранене съдържа 40% въглехидрати с нисък гликемичен индекс, 30% постен протеин и 30% предимно мононенаситени мазнини. Обикновено 3 хранения и 2 малки закуски, без да минават повече от 5 часа без храна.',
    split: { protein: 0.3, fat: 0.3, carbs: 0.4 },
    carbBasis: 'total',
    electrolytes: 'normal',
    highFat: false,
    eat: ['Постно месо, риба, яйца, извара — колкото дланта', 'Зеленчуци и плодове с нисък ГИ', 'Зехтин, авокадо, бадеми'],
    avoid: ['Захар, бял хляб, бял ориз, картофи', 'Тлъсто месо', 'Сладки напитки'],
    tips: ['Чинията: 1/3 протеин, 2/3 зеленчуци и плодове, малко полезна мазнина.', 'Не пропускай хранения — яж на 4–5 часа.'],
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
    name: 'DASH (при високо кръвно)',
    short: 'Малко сол, много зеленчуци, плодове и нискомаслени млечни.',
    description:
      'Диетата DASH е създадена за понижаване на кръвното налягане: натрий до 1500–2300 мг дневно, много калий, магнезий и калций от зеленчуци, плодове, бобови, ядки и нискомаслени млечни, пълнозърнести храни, малко червено месо и сладко.',
    split: { protein: 0.18, fat: 0.27, carbs: 0.55 },
    carbBasis: 'total',
    electrolytes: 'normal',
    highFat: false,
    eat: ['4–5 порции зеленчуци и 4–5 порции плодове', 'Пълнозърнести', 'Нискомаслени млечни', 'Риба, птиче, бобови, ядки (несолени)'],
    avoid: ['Сол, колбаси, саламурени сирена, туршии', 'Готови сосове и супи', 'Сладкиши, сладки напитки'],
    tips: ['Овкусявай с билки и лимон вместо сол.', 'Следи натрия в раздел „Анализ“.'],
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
    name: 'Високопротеинова',
    short: 'Повече протеин (≈35%) за ситост, мускули и отслабване.',
    description:
      'Около 35% от калориите от протеин (1,6–2,2 г на кг тегло), 30% мазнини и 35% въглехидрати. Подходяща при тренировки и отслабване — протеинът засища и пази мускулите.',
    split: { protein: 0.35, fat: 0.3, carbs: 0.35 },
    carbBasis: 'total',
    electrolytes: 'normal',
    highFat: false,
    eat: ['Пилешко, пуешко, риба, яйца', 'Извара, гръцко кисело мляко, сирене', 'Бобови, тофу', 'Зеленчуци'],
    avoid: ['Сладкиши и сладки напитки', 'Тестени без протеин', 'Ултрапреработени храни'],
    tips: ['Разпредели протеина в 3–4 хранения по 25–40 г.', 'Пий достатъчно вода.'],
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
    name: 'Палео',
    short: 'Храни „като нашите предци“: месо, риба, зеленчуци, плодове, ядки.',
    description:
      'Палео диетата изключва зърнени, бобови, млечни, захар и преработени храни. Основата е месо, риба, яйца, зеленчуци, плодове, ядки и семена. Приблизително 30% протеин, 40% мазнини, 30% въглехидрати.',
    split: { protein: 0.3, fat: 0.4, carbs: 0.3 },
    carbBasis: 'total',
    electrolytes: 'normal',
    highFat: true,
    eat: ['Месо, риба, яйца', 'Зеленчуци и плодове', 'Ядки и семена', 'Зехтин, кокосово масло, авокадо'],
    avoid: ['Зърнени и хляб', 'Бобови (вкл. фъстъци)', 'Млечни продукти', 'Захар, рафинирани олиа, преработени храни'],
    tips: ['Избирай месо от животни на свободна паша, когато можеш.', 'Сладките картофи са допустим източник на въглехидрати.'],
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
    name: 'Вегетарианска',
    short: 'Без месо и риба; с яйца и млечни продукти.',
    description:
      'Изключва месо, птици и риба. Протеинът идва от яйца, млечни, бобови, ядки и тофу. Внимание към желязо, B12 и омега-3.',
    split: { protein: 0.18, fat: 0.32, carbs: 0.5 },
    carbBasis: 'total',
    electrolytes: 'normal',
    highFat: false,
    eat: ['Яйца, кисело мляко, сирене', 'Бобови, тофу, темпе', 'Пълнозърнести', 'Зеленчуци, плодове, ядки, семена'],
    avoid: ['Месо и птици', 'Риба и морски дарове', 'Желатин и бульони от месо'],
    tips: ['Комбинирай бобови и зърнени за пълноценен протеин.', 'Витамин C (чушки, цитрусови) подобрява усвояването на желязото.'],
    fit: (f) => {
      if (has(f, 'm', 'f', 'pm')) return 'avoid';
      if (negligible(f)) return 'good';
      return unhealthy(f) ? 'ok' : 'good';
    },
  },
  {
    id: 'vegan',
    name: 'Веганска',
    short: 'Само растителни храни — без месо, риба, яйца, млечни и мед.',
    description:
      'Изцяло растително хранене. Задължителен е източник на витамин B12 (добавка или обогатени храни); внимание към витамин D, омега-3, желязо, цинк, калций и йод.',
    split: { protein: 0.15, fat: 0.3, carbs: 0.55 },
    carbBasis: 'total',
    electrolytes: 'normal',
    highFat: false,
    eat: ['Бобови, тофу, темпе', 'Пълнозърнести', 'Зеленчуци, плодове', 'Ядки, семена, ленено семе, чиа'],
    avoid: ['Месо, риба, морски дарове', 'Яйца, мляко, сирене, масло', 'Мед, желатин'],
    tips: ['Приемай витамин B12 като добавка — от растенията не се набавя.', 'Ленено семе, чиа и орехи дават растителна омега-3.'],
    warning: 'Без добавка на витамин B12 веганското хранене води до дефицит.',
    fit: (f) => {
      if (has(f, 'm', 'f', 'pm', 'd', 'e', 'h')) return 'avoid';
      if (negligible(f)) return 'good';
      return unhealthy(f) ? 'ok' : 'good';
    },
  },
  {
    id: 'carnivore',
    name: 'Карнивор',
    short: 'Само животински храни: месо, риба, яйца, малко млечни.',
    description:
      'Крайна форма на нисковъглехидратно хранене — почти нулеви въглехидрати, само храни от животински произход. Няма дългосрочни изследвания за безопасност.',
    split: { protein: 0.35, fat: 0.65, carbs: 0 },
    carbBasis: 'net',
    carbCapG: 10,
    electrolytes: 'high',
    highFat: true,
    eat: ['Говеждо, свинско, агнешко, карантии', 'Риба, яйца', 'Масло, мас', 'Твърди сирена (по желание)'],
    avoid: ['Всички растителни храни', 'Захар, зърнени, плодове', 'Растителни масла'],
    tips: ['Карантиите (дроб) покриват витамини, които липсват при чисто месо.', 'Следи натрия и калия.'],
    warning: 'Режимът няма фибри и почти няма витамин C. Не се препоръчва дългосрочно без лекарско наблюдение.',
    fit: (f) => {
      if (negligible(f)) return 'good';
      if (has(f, 'm', 'f', 'e')) return net100(f) > 5 || has(f, 's') ? 'ok' : 'good';
      if (has(f, 'd')) return net100(f) <= 4 ? 'ok' : 'avoid';
      return 'avoid';
    },
  },
  {
    id: 'fasting',
    name: 'Лечебно гладуване',
    short: 'Само вода (и електролити) за определен период.',
    description:
      'Водно гладуване — без храна, само вода, неподсладен чай и електролити, обикновено 24–72 часа. Таймерът е в раздел „Пост“. След гладуването храната се въвежда постепенно (бульон, зеленчуци, малки порции).',
    split: { protein: 0, fat: 0, carbs: 0 },
    carbBasis: 'net',
    fastingHours: 24,
    electrolytes: 'high',
    highFat: true,
    noCalories: true,
    eat: ['Вода: 2–3 л на ден', 'Минерална вода, неподсладен билков чай', 'Сол (натрий), калий и магнезий'],
    avoid: ['Всякаква храна и калорични напитки', 'Тежки физически натоварвания', 'Рязко хранене след края — започни с бульон'],
    tips: [
      'Добавяй щипка сол във водата и приемай магнезий — предпазва от главоболие и крампи.',
      'Ставай бавно — може да се появи замайване.',
      'Прекъсни гладуването при силна слабост, сърцебиене или прилошаване.',
    ],
    warning:
      'Гладуване над 24–48 часа — само след консултация с лекар. Не гладувай при бременност и кърмене, диабет на инсулин или таблетки, хранителни разстройства, поднормено тегло, сърдечни, бъбречни заболявания, подагра, или под 18 години.',
    fit: (f) => (negligible(f) && !has(f, 's') ? 'good' : f.id.includes('broth') ? 'ok' : 'avoid'),
  },
];

const DIETS_BY_ID = new Map(DIETS.map((d) => [d.id, d]));

export function getDiet(id: string | null | undefined): Diet {
  return DIETS_BY_ID.get(id as DietId) ?? DIETS[0];
}

export const FIT_LABEL: Record<FoodFit, string> = {
  good: 'Подходяща',
  ok: 'Умерено',
  avoid: 'Избягвай',
};
