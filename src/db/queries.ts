import type { SQLiteDatabase } from 'expo-sqlite';
import type {
  DaySummary,
  FastRecord,
  FoodEntry,
  FoodItem,
  HydrationEntry,
  HydrationTotals,
  MealType,
  NewFoodEntry,
  NewHydrationEntry,
  Nutrients,
  WeightEntry,
} from '@/types';
import { emptyNutrients, fillNutrients, NUTRIENT_KEYS } from '@/data/nutrients';
import { nutrientColumn } from './schema';

const N_COLS = NUTRIENT_KEYS.map(nutrientColumn);

function nutrientsOf(row: any): Nutrients {
  const n = emptyNutrients();
  for (const k of NUTRIENT_KEYS) n[k] = row?.[nutrientColumn(k)] ?? 0;
  return n;
}

function mapFoodRow(row: any): FoodEntry {
  return {
    id: row.id,
    date: row.date,
    timeIso: row.time_iso,
    meal: (row.meal as MealType) ?? 'snack',
    name: row.name,
    source: row.source,
    grams: row.grams,
    foodId: row.food_id ?? null,
    hasMicros: row.has_micros === 1,
    n: nutrientsOf(row),
  };
}

// ---- diary -------------------------------------------------------------------------

/** Returns the new row id (used for "Отмени"). */
export async function insertFoodEntry(db: SQLiteDatabase, entry: NewFoodEntry): Promise<number> {
  const n = fillNutrients(entry.n);
  const cols = ['date', 'time_iso', 'meal', 'name', 'source', 'grams', 'food_id', 'has_micros', ...N_COLS];
  const res = await db.runAsync(
    `INSERT INTO food_entries (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
    entry.date,
    entry.timeIso,
    entry.meal,
    entry.name,
    entry.source,
    entry.grams,
    entry.foodId ?? null,
    entry.hasMicros ? 1 : 0,
    ...NUTRIENT_KEYS.map((k) => n[k])
  );
  return res.lastInsertRowId;
}

export async function updateFoodEntry(db: SQLiteDatabase, id: number, patch: { grams: number | null; meal: MealType; n: Nutrients }) {
  await db.runAsync(
    `UPDATE food_entries SET grams = ?, meal = ?, ${N_COLS.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
    patch.grams,
    patch.meal,
    ...NUTRIENT_KEYS.map((k) => patch.n[k]),
    id
  );
}

export async function deleteFoodEntry(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM food_entries WHERE id = ?', id);
}

export async function getEntriesForDate(db: SQLiteDatabase, date: string): Promise<FoodEntry[]> {
  const rows = await db.getAllAsync('SELECT * FROM food_entries WHERE date = ? ORDER BY time_iso ASC', date);
  return rows.map(mapFoodRow);
}

export async function getEntriesBetween(db: SQLiteDatabase, from: string, to: string): Promise<FoodEntry[]> {
  const rows = await db.getAllAsync('SELECT * FROM food_entries WHERE date BETWEEN ? AND ? ORDER BY date ASC, time_iso ASC', from, to);
  return rows.map(mapFoodRow);
}

export async function getAllFoodEntries(db: SQLiteDatabase): Promise<FoodEntry[]> {
  const rows = await db.getAllAsync('SELECT * FROM food_entries ORDER BY date ASC, time_iso ASC');
  return rows.map(mapFoodRow);
}

/** One row per day that has entries in [from, to]. */
export async function getDaySummaries(db: SQLiteDatabase, from: string, to: string): Promise<DaySummary[]> {
  const sums = N_COLS.map((c) => `COALESCE(SUM(${c}), 0) AS ${c}`).join(', ');
  const rows = await db.getAllAsync<any>(
    `SELECT date, COUNT(*) AS entries, COALESCE(SUM(CASE WHEN has_micros = 1 THEN n_kcal ELSE 0 END), 0) AS kcal_micros, ${sums}
     FROM food_entries WHERE date BETWEEN ? AND ? GROUP BY date ORDER BY date ASC`,
    from,
    to
  );
  return rows.map((r) => ({ date: r.date, entries: r.entries, kcalWithMicros: r.kcal_micros, n: nutrientsOf(r) }));
}

export async function getFirstEntryDate(db: SQLiteDatabase): Promise<string | null> {
  const row = await db.getFirstAsync<{ d: string | null }>('SELECT MIN(date) AS d FROM food_entries');
  return row?.d ?? null;
}

/** Copies every entry of `fromDate` to `toDate` (keeps meals, sets the time to now). */
export async function copyDay(db: SQLiteDatabase, fromDate: string, toDate: string): Promise<number> {
  const cols = ['meal', 'name', 'source', 'grams', 'food_id', 'has_micros', ...N_COLS].join(', ');
  const res = await db.runAsync(
    `INSERT INTO food_entries (date, time_iso, ${cols}) SELECT ?, ?, ${cols} FROM food_entries WHERE date = ?`,
    toDate,
    new Date().toISOString(),
    fromDate
  );
  return res.changes;
}

export async function getRecentFoodIds(db: SQLiteDatabase, limit: number): Promise<string[]> {
  const rows = await db.getAllAsync<{ food_id: string }>(
    `SELECT food_id FROM food_entries WHERE food_id IS NOT NULL GROUP BY food_id ORDER BY MAX(time_iso) DESC LIMIT ?`,
    limit
  );
  return rows.map((r) => r.food_id);
}

/** food id → number of times logged in the last 90 days */
export async function getFoodUseCounts(db: SQLiteDatabase, sinceDate: string): Promise<Map<string, number>> {
  const rows = await db.getAllAsync<{ food_id: string; c: number }>(
    `SELECT food_id, COUNT(*) AS c FROM food_entries WHERE food_id IS NOT NULL AND date >= ? GROUP BY food_id`,
    sinceDate
  );
  return new Map(rows.map((r) => [r.food_id, r.c]));
}

// ---- favorites & custom foods --------------------------------------------------------

export async function getFavoriteIds(db: SQLiteDatabase): Promise<string[]> {
  const rows = await db.getAllAsync<{ food_id: string }>('SELECT food_id FROM favorites ORDER BY created_iso DESC');
  return rows.map((r) => r.food_id);
}

export async function setFavorite(db: SQLiteDatabase, foodId: string, on: boolean) {
  if (on) {
    await db.runAsync('INSERT OR REPLACE INTO favorites (food_id, created_iso) VALUES (?, ?)', foodId, new Date().toISOString());
  } else {
    await db.runAsync('DELETE FROM favorites WHERE food_id = ?', foodId);
  }
}

function mapCustomFood(row: any): FoodItem {
  return {
    id: row.id,
    name: row.name,
    category: 'custom',
    tags: [],
    aliases: [],
    portions: row.portion_label && row.portion_grams ? [{ label: row.portion_label, grams: row.portion_grams }] : [],
    hasMicros: row.has_micros === 1,
    per100: nutrientsOf(row),
    custom: true,
  };
}

export async function getCustomFoods(db: SQLiteDatabase): Promise<FoodItem[]> {
  const rows = await db.getAllAsync('SELECT * FROM custom_foods ORDER BY name COLLATE NOCASE');
  return rows.map(mapCustomFood);
}

export async function saveCustomFood(db: SQLiteDatabase, food: { id?: string; name: string; per100: Partial<Nutrients>; portion?: { label: string; grams: number } | null; hasMicros?: boolean }): Promise<string> {
  const id = food.id ?? `c-${Date.now().toString(36)}`;
  const n = fillNutrients(food.per100);
  const cols = ['id', 'name', 'portion_label', 'portion_grams', 'has_micros', 'created_iso', ...N_COLS];
  await db.runAsync(
    `INSERT OR REPLACE INTO custom_foods (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
    id,
    food.name,
    food.portion?.label ?? null,
    food.portion?.grams ?? null,
    food.hasMicros ? 1 : 0,
    new Date().toISOString(),
    ...NUTRIENT_KEYS.map((k) => n[k])
  );
  return id;
}

export async function deleteCustomFood(db: SQLiteDatabase, id: string) {
  await db.runAsync('DELETE FROM custom_foods WHERE id = ?', id);
  await db.runAsync('DELETE FROM favorites WHERE food_id = ?', id);
}

// ---- weight -------------------------------------------------------------------------

export async function upsertWeightEntry(db: SQLiteDatabase, date: string, weightKg: number) {
  await db.runAsync(
    `INSERT INTO weight_entries (date, time_iso, weight_kg) VALUES (?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET weight_kg = excluded.weight_kg, time_iso = excluded.time_iso`,
    date,
    new Date().toISOString(),
    weightKg
  );
}

export async function getWeightEntries(db: SQLiteDatabase): Promise<WeightEntry[]> {
  const rows = await db.getAllAsync<{ date: string; weight_kg: number }>('SELECT date, weight_kg FROM weight_entries ORDER BY date ASC');
  return rows.map((r) => ({ date: r.date, weightKg: r.weight_kg }));
}

export async function deleteWeightEntry(db: SQLiteDatabase, date: string) {
  await db.runAsync('DELETE FROM weight_entries WHERE date = ?', date);
}

// ---- hydration ----------------------------------------------------------------------

function mapHydrationRow(row: any): HydrationEntry {
  return {
    id: row.id,
    date: row.date,
    timeIso: row.time_iso,
    waterMl: row.water_ml,
    sodiumMg: row.sodium_mg,
    potassiumMg: row.potassium_mg,
    magnesiumMg: row.magnesium_mg,
  };
}

export async function insertHydrationEntry(db: SQLiteDatabase, entry: NewHydrationEntry): Promise<number> {
  const res = await db.runAsync(
    `INSERT INTO hydration_entries (date, time_iso, water_ml, sodium_mg, potassium_mg, magnesium_mg) VALUES (?, ?, ?, ?, ?, ?)`,
    entry.date,
    entry.timeIso,
    entry.waterMl,
    entry.sodiumMg,
    entry.potassiumMg,
    entry.magnesiumMg
  );
  return res.lastInsertRowId;
}

export async function deleteHydrationEntry(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM hydration_entries WHERE id = ?', id);
}

export async function getHydrationTotals(db: SQLiteDatabase, date: string): Promise<HydrationTotals> {
  const row = await db.getFirstAsync<any>(
    `SELECT COALESCE(SUM(water_ml), 0) AS water_ml, COALESCE(SUM(sodium_mg), 0) AS sodium_mg,
            COALESCE(SUM(potassium_mg), 0) AS potassium_mg, COALESCE(SUM(magnesium_mg), 0) AS magnesium_mg
     FROM hydration_entries WHERE date = ?`,
    date
  );
  return {
    waterMl: row?.water_ml ?? 0,
    sodiumMg: row?.sodium_mg ?? 0,
    potassiumMg: row?.potassium_mg ?? 0,
    magnesiumMg: row?.magnesium_mg ?? 0,
  };
}

/** Electrolyte supplements per day in [from, to] (they count towards the nutrient analysis). */
export async function getHydrationByDay(db: SQLiteDatabase, from: string, to: string): Promise<Map<string, HydrationTotals>> {
  const rows = await db.getAllAsync<any>(
    `SELECT date, SUM(water_ml) AS water_ml, SUM(sodium_mg) AS sodium_mg, SUM(potassium_mg) AS potassium_mg, SUM(magnesium_mg) AS magnesium_mg
     FROM hydration_entries WHERE date BETWEEN ? AND ? GROUP BY date`,
    from,
    to
  );
  return new Map(
    rows.map((r) => [r.date, { waterMl: r.water_ml ?? 0, sodiumMg: r.sodium_mg ?? 0, potassiumMg: r.potassium_mg ?? 0, magnesiumMg: r.magnesium_mg ?? 0 }])
  );
}

export async function getAllHydration(db: SQLiteDatabase): Promise<HydrationEntry[]> {
  const rows = await db.getAllAsync('SELECT * FROM hydration_entries ORDER BY date ASC, time_iso ASC');
  return rows.map(mapHydrationRow);
}

// ---- fasting ------------------------------------------------------------------------

function mapFast(row: any): FastRecord {
  return { id: row.id, startIso: row.start_iso, endIso: row.end_iso ?? null, goalHours: row.goal_hours };
}

export async function getActiveFast(db: SQLiteDatabase): Promise<FastRecord | null> {
  const row = await db.getFirstAsync('SELECT * FROM fasts WHERE end_iso IS NULL ORDER BY start_iso DESC LIMIT 1');
  return row ? mapFast(row) : null;
}

export async function startFast(db: SQLiteDatabase, goalHours: number, startIso = new Date().toISOString()) {
  await db.runAsync('UPDATE fasts SET end_iso = ? WHERE end_iso IS NULL', startIso);
  await db.runAsync('INSERT INTO fasts (start_iso, end_iso, goal_hours) VALUES (?, NULL, ?)', startIso, goalHours);
}

export async function endFast(db: SQLiteDatabase, id: number) {
  await db.runAsync('UPDATE fasts SET end_iso = ? WHERE id = ?', new Date().toISOString(), id);
}

export async function setFastGoal(db: SQLiteDatabase, id: number, goalHours: number) {
  await db.runAsync('UPDATE fasts SET goal_hours = ? WHERE id = ?', goalHours, id);
}

export async function getFasts(db: SQLiteDatabase, limit = 50): Promise<FastRecord[]> {
  const rows = await db.getAllAsync('SELECT * FROM fasts WHERE end_iso IS NOT NULL ORDER BY start_iso DESC LIMIT ?', limit);
  return rows.map(mapFast);
}

export async function deleteFast(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM fasts WHERE id = ?', id);
}

// ---- backup -------------------------------------------------------------------------

export interface BackupData {
  app: 'azqm';
  version: 1;
  exportedIso: string;
  tables: Record<string, Record<string, unknown>[]>;
}

const BACKUP_TABLES = ['food_entries', 'custom_foods', 'favorites', 'weight_entries', 'hydration_entries', 'fasts'] as const;

export async function exportDatabase(db: SQLiteDatabase): Promise<BackupData> {
  const tables: BackupData['tables'] = {};
  for (const t of BACKUP_TABLES) tables[t] = await db.getAllAsync<Record<string, unknown>>(`SELECT * FROM ${t}`);
  return { app: 'azqm', version: 1, exportedIso: new Date().toISOString(), tables };
}

/** Replaces all diary data with the backup's rows (unknown columns are skipped). */
export async function importDatabase(db: SQLiteDatabase, data: BackupData) {
  if (data?.app !== 'azqm' || !data.tables) throw new Error('Файлът не е резервно копие на Azqm.');
  await db.withTransactionAsync(async () => {
    for (const t of BACKUP_TABLES) {
      await db.runAsync(`DELETE FROM ${t}`);
      const rows = data.tables[t] ?? [];
      if (rows.length === 0) continue;
      const info = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${t})`);
      const known = new Set(info.map((c) => c.name));
      for (const row of rows) {
        const cols = Object.keys(row).filter((c) => known.has(c));
        if (cols.length === 0) continue;
        await db.runAsync(
          `INSERT INTO ${t} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
          ...cols.map((c) => row[c] as string | number | null)
        );
      }
    }
  });
}

export async function wipeDatabase(db: SQLiteDatabase) {
  await db.withTransactionAsync(async () => {
    for (const t of BACKUP_TABLES) await db.runAsync(`DELETE FROM ${t}`);
  });
}
