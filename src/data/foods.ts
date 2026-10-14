/**
 * Offline food database. Values per 100 g come from USDA FoodData Central (SR Legacy, public domain);
 * Bulgarian dishes are computed from typical home recipes made of USDA ingredients.
 * The data lives in foods.generated.ts (built by scripts/build-foods.mjs) — this module turns it into
 * FoodItem objects and provides search.
 */
import type { FoodCategory, FoodItem, FoodTag, Nutrients, Portion } from '@/types';
import { FOOD_DATA, NUTRIENT_KEYS } from './foods.generated';
import { foodName, getLang, tr, type Lang } from '@/i18n';

export const FOOD_CATEGORIES: { key: FoodCategory; readonly label: string; emoji: string }[] = (
  [
    ['meat', 'Месо', 'Meat', '🥩'],
    ['deli', 'Колбаси', 'Deli meats', '🥓'],
    ['fish', 'Риба', 'Fish', '🐟'],
    ['eggs', 'Яйца', 'Eggs', '🥚'],
    ['dairy', 'Млечни', 'Dairy', '🥛'],
    ['cheese', 'Сирена', 'Cheese', '🧀'],
    ['fats', 'Мазнини', 'Fats', '🧈'],
    ['vegetables', 'Зеленчуци', 'Vegetables', '🥦'],
    ['fruits', 'Плодове', 'Fruit', '🍎'],
    ['nuts', 'Ядки', 'Nuts', '🥜'],
    ['legumes', 'Бобови', 'Legumes', '🌱'],
    ['grains', 'Хляб и зърнени', 'Bread & grains', '🍞'],
    ['sweets', 'Сладки', 'Sweets', '🍫'],
    ['sauces', 'Сосове', 'Sauces', '🧂'],
    ['drinks', 'Напитки', 'Drinks', '☕'],
    ['alcohol', 'Алкохол', 'Alcohol', '🍷'],
    ['dishes', 'Ястия', 'Dishes', '🍲'],
    ['custom', 'Мои храни', 'My foods', '⭐'],
  ] as const
).map(([key, bg, en, emoji]) => ({
  key,
  emoji,
  get label() {
    return tr(bg, en);
  },
}));

const CATEGORY_BY_KEY = new Map(FOOD_CATEGORIES.map((c) => [c.key, c]));

export function categoryLabel(key: FoodCategory): string {
  return CATEGORY_BY_KEY.get(key)?.label ?? key;
}

export function categoryEmoji(key: FoodCategory): string {
  return CATEGORY_BY_KEY.get(key)?.emoji ?? '🍽️';
}

function parsePortions(raw: string, rawEn: string): Portion[] {
  if (!raw) return [];
  const en = rawEn.split('|');
  return raw.split('|').map((p, idx) => {
    const i = p.lastIndexOf(':');
    const bg = p.slice(0, i);
    const enLabel = en[idx] || bg;
    return {
      grams: Number(p.slice(i + 1)),
      get label() {
        return tr(bg, enLabel);
      },
    };
  });
}

/** Built-in foods carry both names; `name` follows the app language. */
export const FOODS: FoodItem[] = FOOD_DATA.map(([id, nameBg, nameEn, category, tags, aliases, portions, portionsEn, full, values]) => {
  const per100 = {} as Nutrients;
  NUTRIENT_KEYS.forEach((k, i) => (per100[k] = values[i] ?? 0));
  return {
    id,
    get name() {
      return foodName(id, nameBg, nameEn);
    },
    nameBg,
    nameEn,
    category: category as FoodCategory,
    tags: (tags ? tags.split(',') : []) as FoodTag[],
    aliases: aliases ? aliases.split('|') : [],
    portions: parsePortions(portions, portionsEn),
    hasMicros: full === 1,
    per100,
  };
});
const FOODS_BY_ID = new Map(FOODS.map((f) => [f.id, f]));

export function getFoodById(id: string): FoodItem | undefined {
  return FOODS_BY_ID.get(id);
}

// ---- search ----------------------------------------------------------------------

/** Bulgarian "шльокавица" / streamlined Latin → Cyrillic, longest sequences first. */
const LATIN_MULTI: [string, string][] = [
  ['sht', 'щ'],
  ['sh', 'ш'],
  ['ch', 'ч'],
  ['zh', 'ж'],
  ['ts', 'ц'],
  ['yu', 'ю'],
  ['iu', 'ю'],
  ['ya', 'я'],
  ['ia', 'я'],
  ['yo', 'йо'],
];
const LATIN_SINGLE: Record<string, string> = {
  a: 'а', b: 'б', v: 'в', w: 'в', g: 'г', d: 'д', e: 'е', z: 'з', i: 'и', j: 'ж', k: 'к', l: 'л', m: 'м', n: 'н',
  o: 'о', p: 'п', r: 'р', s: 'с', t: 'т', u: 'у', f: 'ф', h: 'х', x: 'х', c: 'ц', q: 'я', y: 'ъ', '4': 'ч', '6': 'ш',
};

function latinToCyrillic(word: string): string {
  let out = '';
  let i = 0;
  outer: while (i < word.length) {
    for (const [lat, cyr] of LATIN_MULTI) {
      if (word.startsWith(lat, i)) {
        out += cyr;
        i += lat.length;
        continue outer;
      }
    }
    out += LATIN_SINGLE[word[i]] ?? word[i];
    i++;
  }
  return out;
}

/** Latin letters with accents → plain letters, so "kase" finds "Käse" and "cafe" finds "café". */
const FOLD: Record<string, string> = {
  à: 'a', á: 'a', â: 'a', ã: 'a', ä: 'a', å: 'a', æ: 'ae', ç: 'c', è: 'e', é: 'e', ê: 'e', ë: 'e', ì: 'i', í: 'i', î: 'i', ï: 'i',
  ı: 'i', ñ: 'n', ò: 'o', ó: 'o', ô: 'o', õ: 'o', ö: 'o', ø: 'o', œ: 'oe', ù: 'u', ú: 'u', û: 'u', ü: 'u', ý: 'y', ÿ: 'y', ß: 'ss',
  ğ: 'g', ş: 's', ѝ: 'и', ё: 'е',
  // "İ".toLowerCase() is "i" + a combining dot above
  '\u0307': '',
};
const FOLD_RE = new RegExp(`[${Object.keys(FOLD).join('')}]`, 'g');

/** Lower-cased text → accents folded (Cyrillic letters other than ѝ and ё stay as they are). */
function fold(lower: string): string {
  return lower.replace(FOLD_RE, (c) => FOLD[c]);
}

export function normalize(text: string): string {
  return fold(text.toLowerCase())
    .replace(/[.,;:()"'„“”«»‘’¿¡%/\\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Query words; Latin words get Cyrillic alternatives ("y" can be ъ or й). */
function queryWords(query: string): string[][] {
  return normalize(query)
    .split(' ')
    .filter(Boolean)
    .map((w) => {
      if (!/[a-z0-9]/.test(w) || /^\d+$/.test(w)) return [w];
      const cyr = latinToCyrillic(w);
      return Array.from(new Set([w, cyr, cyr.replace(/ъ/g, 'й'), cyr.replace(/ъ/g, 'и')]));
    });
}

/** A per-food string derived from the name in the app language, cached per language. */
function perLanguage(make: (f: FoodItem) => string): (f: FoodItem) => string {
  const byLang = new Map<Lang, WeakMap<FoodItem, string>>();
  return (f) => {
    const lang = getLang();
    let cache = byLang.get(lang);
    if (!cache) {
      cache = new WeakMap();
      byLang.set(lang, cache);
    }
    let value = cache.get(f);
    if (value === undefined) {
      value = make(f);
      cache.set(f, value);
    }
    return value;
  };
}

/** Search covers the Bulgarian and English names, the name in the app language and the aliases. */
const searchTextOf = perLanguage((f) => normalize([f.nameBg ?? f.name, f.nameEn ?? '', f.name, ...f.aliases].join(' ')));

const nameTextOf = perLanguage((f) => normalize(f.name));

/**
 * Alphabetical key. Once accents are folded (ä → a), the letters of every app language are in alphabet order in
 * Unicode, so comparing keys with `<` matches the locale collator closely (checked on all built-in foods).
 * localeCompare builds a new collator on every call in Hermes, and sorting the full list calls it thousands of times.
 * Typographic quotes become '"' so „Добруджа“ sorts before the letters, as the collator puts it.
 */
const sortKeyOf = perLanguage((f) => fold(f.name.toLowerCase()).replace(/[„“”«»]/g, '"'));

function byName(a: FoodItem, b: FoodItem): number {
  const ka = sortKeyOf(a);
  const kb = sortKeyOf(b);
  return ka < kb ? -1 : ka > kb ? 1 : 0;
}

/**
 * Every query word must appear somewhere in the name/aliases (substring, so "пиле печ" finds
 * "Пилешко филе, печено"). Results are ranked: name starts with the query, then whole-word hits,
 * then `boost` (favorites/frequently used), then shorter names.
 */
export function searchFoods(
  query: string,
  pool: FoodItem[],
  opts: { category?: FoodCategory | null; boost?: (f: FoodItem) => number; limit?: number } = {}
): FoodItem[] {
  const words = queryWords(query);
  const { category, boost, limit = 80 } = opts;
  const scored: { f: FoodItem; score: number }[] = [];
  for (const f of pool) {
    if (category && f.category !== category) continue;
    if (words.length === 0) {
      scored.push({ f, score: boost?.(f) ?? 0 });
      continue;
    }
    const text = searchTextOf(f);
    const name = nameTextOf(f);
    let score = 0;
    let ok = true;
    for (const alts of words) {
      let best = -1;
      for (const w of alts) {
        const at = text.indexOf(w);
        if (at < 0) continue;
        let s = 1;
        if (name.startsWith(w)) s += 6;
        else if (name.includes(` ${w}`) || at === 0) s += 3;
        if (name.includes(w)) s += 1;
        best = Math.max(best, s);
      }
      if (best < 0) {
        ok = false;
        break;
      }
      score += best;
    }
    if (!ok) continue;
    score += (boost?.(f) ?? 0) - f.name.length / 60;
    scored.push({ f, score });
  }
  scored.sort((a, b) => b.score - a.score || byName(a.f, b.f));
  return scored.slice(0, limit).map((s) => s.f);
}

/** Portions to offer for a food: its own household portions first, then common gram amounts. */
export function portionOptions(food: FoodItem): Portion[] {
  const grams = new Set(food.portions.map((p) => p.grams));
  const generic = [50, 100, 150, 200, 250].filter((g) => !grams.has(g)).map((g) => ({ label: tr('{g} г', '{g} g', { g }), grams: g }));
  return [...food.portions, ...generic];
}

export function defaultPortion(food: FoodItem): Portion {
  return food.portions[0] ?? { label: tr('100 г', '100 g'), grams: 100 };
}
