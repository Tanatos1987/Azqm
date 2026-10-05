/**
 * Offline food database. Values per 100 g come from USDA FoodData Central (SR Legacy, public domain);
 * Bulgarian dishes are computed from typical home recipes made of USDA ingredients.
 * The data lives in foods.generated.ts (built by scripts/build-foods.mjs) — this module turns it into
 * FoodItem objects and provides search.
 */
import type { FoodCategory, FoodItem, FoodTag, Nutrients, Portion } from '@/types';
import { FOOD_DATA, NUTRIENT_KEYS } from './foods.generated';

export const FOOD_CATEGORIES: { key: FoodCategory; label: string; emoji: string }[] = [
  { key: 'meat', label: 'Месо', emoji: '🥩' },
  { key: 'deli', label: 'Колбаси', emoji: '🥓' },
  { key: 'fish', label: 'Риба', emoji: '🐟' },
  { key: 'eggs', label: 'Яйца', emoji: '🥚' },
  { key: 'dairy', label: 'Млечни', emoji: '🥛' },
  { key: 'cheese', label: 'Сирена', emoji: '🧀' },
  { key: 'fats', label: 'Мазнини', emoji: '🧈' },
  { key: 'vegetables', label: 'Зеленчуци', emoji: '🥦' },
  { key: 'fruits', label: 'Плодове', emoji: '🍎' },
  { key: 'nuts', label: 'Ядки', emoji: '🥜' },
  { key: 'legumes', label: 'Бобови', emoji: '🌱' },
  { key: 'grains', label: 'Хляб и зърнени', emoji: '🍞' },
  { key: 'sweets', label: 'Сладки', emoji: '🍫' },
  { key: 'sauces', label: 'Сосове', emoji: '🧂' },
  { key: 'drinks', label: 'Напитки', emoji: '☕' },
  { key: 'alcohol', label: 'Алкохол', emoji: '🍷' },
  { key: 'dishes', label: 'Ястия', emoji: '🍲' },
  { key: 'custom', label: 'Мои храни', emoji: '⭐' },
];

const CATEGORY_BY_KEY = new Map(FOOD_CATEGORIES.map((c) => [c.key, c]));

export function categoryLabel(key: FoodCategory): string {
  return CATEGORY_BY_KEY.get(key)?.label ?? key;
}

export function categoryEmoji(key: FoodCategory): string {
  return CATEGORY_BY_KEY.get(key)?.emoji ?? '🍽️';
}

function parsePortions(raw: string): Portion[] {
  if (!raw) return [];
  return raw.split('|').map((p) => {
    const i = p.lastIndexOf(':');
    return { label: p.slice(0, i), grams: Number(p.slice(i + 1)) };
  });
}

export const FOODS: FoodItem[] = FOOD_DATA.map(([id, name, category, tags, aliases, portions, full, values]) => {
  const per100 = {} as Nutrients;
  NUTRIENT_KEYS.forEach((k, i) => (per100[k] = values[i] ?? 0));
  return {
    id,
    name,
    category: category as FoodCategory,
    tags: (tags ? tags.split(',') : []) as FoodTag[],
    aliases: aliases ? aliases.split('|') : [],
    portions: parsePortions(portions),
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

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ѝ/g, 'и')
    .replace(/ё/g, 'е')
    .replace(/[.,;:()"'„“%/\\-]+/g, ' ')
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

const SEARCH_TEXT = new WeakMap<FoodItem, string>();
function searchTextOf(f: FoodItem): string {
  let t = SEARCH_TEXT.get(f);
  if (!t) {
    t = normalize([f.name, ...f.aliases].join(' '));
    SEARCH_TEXT.set(f, t);
  }
  return t;
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
    const name = normalize(f.name);
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
  scored.sort((a, b) => b.score - a.score || a.f.name.localeCompare(b.f.name, 'bg'));
  return scored.slice(0, limit).map((s) => s.f);
}

/** Portions to offer for a food: its own household portions first, then common gram amounts. */
export function portionOptions(food: FoodItem): Portion[] {
  const grams = new Set(food.portions.map((p) => p.grams));
  const generic = [50, 100, 150, 200, 250].filter((g) => !grams.has(g)).map((g) => ({ label: `${g} г`, grams: g }));
  return [...food.portions, ...generic];
}

export function defaultPortion(food: FoodItem): Portion {
  return food.portions[0] ?? { label: '100 г', grams: 100 };
}
