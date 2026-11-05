// Demo data for the Google Play screenshots (store-screenshots.yml).
// Writes two SQL files into <dir>: app.sql for azqm.db and kv.sql for AsyncStorage (RKStorage).
// The person is made up: a 34-year-old woman on a diet for two months, 84.6 → 78.2 kg.
//   node scripts/store-shots/seed.mjs <en|bg> <dir>            → everything except a running fast
//   node scripts/store-shots/seed.mjs <en|bg> <dir> --fast     → fast.sql: a fast running for 13 h 40 min
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { FOOD_DATA, NUTRIENT_KEYS } from '../../src/data/foods.generated.ts';

const [lang, dir, flag] = process.argv.slice(2);
if (!['en', 'bg'].includes(lang) || !dir) throw new Error('usage: seed.mjs <en|bg> <dir> [--fast]');

const q = (s) => (s === null || s === undefined ? 'NULL' : typeof s === 'number' ? String(s) : `'${String(s).replace(/'/g, "''")}'`);
const pad = (n) => String(n).padStart(2, '0');
const now = new Date();
const dayKey = (offset) => {
  const d = new Date(now);
  d.setDate(d.getDate() - offset);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const at = (offset, hh, mm) => {
  const d = new Date(now);
  d.setDate(d.getDate() - offset);
  d.setHours(hh, mm, 0, 0);
  return d.toISOString();
};

if (flag === '--fast') {
  const start = new Date(now.getTime() - (13 * 60 + 40) * 60 * 1000).toISOString();
  writeFileSync(join(dir, 'fast.sql'), `INSERT INTO fasts (start_iso, end_iso, goal_hours) VALUES (${q(start)}, NULL, 16);\n`);
  process.exit(0);
}

// deterministic "random" so every run gives the same pictures
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

const food = (...ids) => {
  for (const id of ids) {
    const f = FOOD_DATA.find((x) => x[0] === id) ?? FOOD_DATA.find((x) => x[0].startsWith(id));
    if (f) return f;
  }
  throw new Error(`no food for ${ids.join(' / ')}`);
};

const cols = ['date', 'time_iso', 'meal', 'name', 'source', 'grams', 'food_id', 'has_micros', ...NUTRIENT_KEYS.map((k) => `n_${k}`)];
const sql = ['BEGIN;', 'DELETE FROM food_entries;', 'DELETE FROM weight_entries;', 'DELETE FROM hydration_entries;', 'DELETE FROM fasts;', 'DELETE FROM body_measurements;', 'DELETE FROM favorites;'];

const entry = (offset, meal, hh, mm, ids, grams) => {
  const f = food(...ids);
  const g = Math.round(grams * (offset === 0 ? 1 : 0.85 + rnd() * 0.3));
  const n = f[9].map((v) => Math.round(v * g * 10) / 1000);
  const vals = [dayKey(offset), at(offset, hh, mm), meal, f[1], 'database', g, f[0], f[8], ...n];
  sql.push(`INSERT INTO food_entries (${cols.join(', ')}) VALUES (${vals.map(q).join(', ')});`);
};

const breakfast = [
  [['egg-scrambled'], 130], [['avocado-raw'], 100], [['coffee-brewed-filter'], 240],
];
const lunches = [
  [[['salmon-atlantic-grilled', 'salmon-grilled', 'salmon'], 160], [['lettuce-romaine-raw'], 90], [['cucumber-raw'], 120], [['olive-oil'], 12]],
  [[['shopska', 'salad-shopska'], 320], [['chicken-breast-grilled', 'chicken-breast', 'chicken'], 150]],
];
const dinner = [
  [['beef-ribeye-grilled'], 190], [['broccoli-boiled'], 160], [['butter-salted'], 10],
];
const snacks = [[['almonds-raw'], 30], [['kashkaval-cow'], 40]];

for (let d = 0; d <= 20; d++) {
  for (const [ids, g] of breakfast) entry(d, 'breakfast', 8, 10, ids, g);
  for (const [ids, g] of lunches[d % 2]) entry(d, 'lunch', 13, 5, ids, g);
  if (d === 0) continue; // today: breakfast and lunch so far
  for (const [ids, g] of dinner) entry(d, 'dinner', 19, 30, ids, g);
  if (d % 3 !== 0) for (const [ids, g] of snacks) entry(d, 'snack', 16, 40, ids, g);
}

for (const id of ['egg-scrambled', 'avocado-raw', 'almonds-raw', 'beef-ribeye-grilled']) {
  sql.push(`INSERT OR IGNORE INTO favorites (food_id, created_iso) VALUES (${q(food(id)[0])}, ${q(at(30, 9, 0))});`);
}

// weight: 84.6 kg two months ago → 78.2 kg today, small day-to-day noise, a few missed days
for (let d = 62; d >= 0; d--) {
  if (d % 9 === 4) continue;
  const trend = 78.2 + (84.6 - 78.2) * (d / 62);
  const w = d === 0 ? 78.2 : Math.round((trend + (rnd() - 0.5) * 0.7) * 10) / 10;
  sql.push(`INSERT INTO weight_entries (date, time_iso, weight_kg) VALUES (${q(dayKey(d))}, ${q(at(d, 7, 30))}, ${w});`);
}

// tape measurements once a week (cm)
for (let w = 8; w >= 0; w--) {
  const d = w * 7, k = w / 8;
  const r = (a, b) => Math.round((b + (a - b) * k) * 10) / 10;
  sql.push(
    `INSERT INTO body_measurements (date, time_iso, waist, hips, chest, arm, thigh, neck) VALUES (${q(dayKey(d))}, ${q(at(d, 7, 40))}, ${r(93, 86.5)}, ${r(109, 104)}, ${r(98, 95)}, ${r(31.5, 30)}, ${r(61, 58)}, ${r(34.5, 33.5)});`
  );
}

// water: today 1.75 l so far, earlier days 2–2.5 l
for (let d = 0; d <= 20; d++) {
  const glasses = d === 0 ? 7 : 8 + Math.round(rnd() * 2);
  for (let i = 0; i < glasses; i++) {
    sql.push(`INSERT INTO hydration_entries (date, time_iso, water_ml, sodium_mg, potassium_mg, magnesium_mg) VALUES (${q(dayKey(d))}, ${q(at(d, 8 + i, 15))}, 250, 0, 0, 0);`);
  }
}

// finished 16:8 fasts on earlier days (history)
for (let d = 12; d >= 1; d--) {
  const hours = 16 + Math.round(rnd() * 20) / 10;
  const start = at(d, 20, 0);
  const end = new Date(new Date(start).getTime() + hours * 3600 * 1000).toISOString();
  sql.push(`INSERT INTO fasts (start_iso, end_iso, goal_hours) VALUES (${q(start)}, ${q(end)}, 16);`);
}
sql.push('COMMIT;', 'PRAGMA wal_checkpoint(TRUNCATE);');
writeFileSync(join(dir, 'app.sql'), sql.join('\n') + '\n');

const diet = lang === 'bg' ? 'uzunov' : 'keto';
const settings = {
  dietId: diet,
  goals: lang === 'bg' ? { calories: 1650, protein: 124, fat: 119, carbs: 20 } : { calories: 1650, protein: 103, fat: 128, carbs: 21 },
  themeId: 'obsidian_amber',
  themePref: 'dark',
  textScale: 'normal',
  language: lang,
  fastingGoalHours: 16,
  visionProvider: 'gemini',
  visionModel: 'gemini-2.5-flash',
};
const profile = { sex: 'female', age: 34, heightCm: 168, weightKg: 78.2, targetWeightKg: 72, activity: 'light', goal: 'lose' };
const kv = {
  azqm_settings_v1: JSON.stringify(settings),
  azqm_profile_v1: JSON.stringify(profile),
  'azqm.tour': '1',
  'azqm.pro': '1',
};
writeFileSync(
  join(dir, 'kv.sql'),
  [
    'CREATE TABLE IF NOT EXISTS catalystLocalStorage (key TEXT PRIMARY KEY, value TEXT NOT NULL);',
    ...Object.entries(kv).map(([k, v]) => `INSERT OR REPLACE INTO catalystLocalStorage (key, value) VALUES (${q(k)}, ${q(v)});`),
    'PRAGMA wal_checkpoint(TRUNCATE);',
  ].join('\n') + '\n'
);
console.log(`seed ${lang}: ${sql.length} statements, diet ${diet}`);
