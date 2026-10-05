// Downloads USDA FoodData Central "SR Legacy" (public domain) and condenses it into
// .usda/usda-foods.json — the input for scripts/build-foods.mjs.
//   node scripts/fetch-usda.mjs
import fs from 'node:fs';
import path from 'node:path';
import { unzipSync, strFromU8 } from 'fflate';

const URL = 'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip';
const OUT_DIR = path.resolve('.usda');

// nutrient key -> FDC nutrient ids; the first one present wins
const NUTRIENTS = {
  kcal: [1008], protein: [1003], fat: [1004], carbs: [1005], fiber: [1079], sugar: [2000], satFat: [1258],
  sodium: [1093], potassium: [1092], magnesium: [1090], calcium: [1087], phosphorus: [1091], iron: [1089],
  zinc: [1095], copper: [1098], manganese: [1101], selenium: [1103],
  vitA: [1106], retinol: [1105], vitC: [1162], vitD: [1114], vitE: [1109], vitK: [1185],
  b1: [1165], b2: [1166], b3: [1167], b6: [1175], folate: [1190], b12: [1178],
  ala: [1404, 1270], epa: [1278], dha: [1272], dpa: [1280],
};

function parseLine(line) {
  const out = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else quoted = false;
      } else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

function rows(files, name) {
  const key = Object.keys(files).find((k) => k.endsWith(`/${name}`) || k === name);
  if (!key) throw new Error(`${name} missing from the USDA archive`);
  const lines = strFromU8(files[key]).split(/\r?\n/).filter(Boolean);
  const header = parseLine(lines[0]);
  return lines.slice(1).map((l) => {
    const cols = parseLine(l);
    return Object.fromEntries(header.map((h, i) => [h, cols[i]]));
  });
}

console.log('Downloading', URL);
const res = await fetch(URL);
if (!res.ok) throw new Error(`USDA download failed: ${res.status}`);
const files = unzipSync(new Uint8Array(await res.arrayBuffer()));

const categories = Object.fromEntries(rows(files, 'food_category.csv').map((r) => [r.id, r.description]));
const foods = {};
for (const r of rows(files, 'food.csv')) foods[r.fdc_id] = { d: r.description, c: categories[r.food_category_id] ?? '', n: {}, p: [] };

const byId = new Map();
for (const [key, ids] of Object.entries(NUTRIENTS)) ids.forEach((id, rank) => byId.set(String(id), { key, rank }));
const rank = new Map();
for (const r of rows(files, 'food_nutrient.csv')) {
  const m = byId.get(r.nutrient_id);
  const f = foods[r.fdc_id];
  if (!m || !f) continue;
  const k = `${r.fdc_id}:${m.key}`;
  if (rank.has(k) && rank.get(k) <= m.rank) continue;
  rank.set(k, m.rank);
  f.n[m.key] = Number(r.amount);
}

const units = Object.fromEntries(rows(files, 'measure_unit.csv').map((r) => [r.id, r.name]));
for (const r of rows(files, 'food_portion.csv')) {
  const f = foods[r.fdc_id];
  if (!f) continue;
  const unit = units[r.measure_unit_id] && units[r.measure_unit_id] !== 'undetermined' ? units[r.measure_unit_id] : '';
  f.p.push([[r.amount, unit, r.modifier, r.portion_description].filter(Boolean).join(' ').trim(), Number(r.gram_weight)]);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'usda-foods.json'), JSON.stringify(foods));
console.log(`Wrote ${Object.keys(foods).length} foods to .usda/usda-foods.json`);
