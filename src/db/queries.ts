import type { SQLiteDatabase } from 'expo-sqlite';
import type {
  DailyCalories,
  FoodEntry,
  NewFoodEntry,
  HydrationEntry,
  NewHydrationEntry,
  MacroTotals,
  HydrationTotals,
  Micronutrients,
  WeightEntry,
} from '@/types';
import { EMPTY_MICROS, fillMicros, MICRONUTRIENTS } from '@/data/micronutrients';

const MICRO_COLUMNS = MICRONUTRIENTS.map((m) => m.column);

function mapMicros(row: any): Micronutrients {
  const micros = { ...EMPTY_MICROS };
  for (const m of MICRONUTRIENTS) micros[m.key] = row?.[m.column] ?? 0;
  return micros;
}

function mapFoodRow(row: any): FoodEntry {
  return {
    id: row.id,
    date: row.date,
    timeIso: row.time_iso,
    name: row.name,
    source: row.source,
    grams: row.grams,
    calories: row.calories,
    protein: row.protein,
    fat: row.fat,
    carbs: row.carbs,
    fiber: row.fiber,
    netCarbs: row.net_carbs,
    micros: mapMicros(row),
    foodId: row.food_id ?? null,
  };
}

export async function insertFoodEntry(db: SQLiteDatabase, entry: NewFoodEntry) {
  const micros = fillMicros(entry.micros);
  const columns = ['date', 'time_iso', 'name', 'source', 'grams', 'calories', 'protein', 'fat', 'carbs', 'fiber', 'net_carbs', 'food_id', ...MICRO_COLUMNS];
  await db.runAsync(
    `INSERT INTO food_entries (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
    entry.date,
    entry.timeIso,
    entry.name,
    entry.source,
    entry.grams,
    entry.calories,
    entry.protein,
    entry.fat,
    entry.carbs,
    entry.fiber,
    entry.netCarbs,
    entry.foodId ?? null,
    ...MICRONUTRIENTS.map((m) => micros[m.key])
  );
}

export async function getDailyMicros(db: SQLiteDatabase, date: string): Promise<Micronutrients> {
  const sums = MICRONUTRIENTS.map((m) => `COALESCE(SUM(${m.column}), 0) as ${m.column}`).join(', ');
  const row = await db.getFirstAsync<any>(`SELECT ${sums} FROM food_entries WHERE date = ?`, date);
  return mapMicros(row);
}

/** Per-day totals for every date in [fromDate, toDate] that has entries. */
export async function getDailyCaloriesRange(db: SQLiteDatabase, fromDate: string, toDate: string): Promise<DailyCalories[]> {
  const rows = await db.getAllAsync<any>(
    `SELECT date, SUM(calories) as calories, SUM(net_carbs) as net_carbs
     FROM food_entries WHERE date BETWEEN ? AND ? GROUP BY date ORDER BY date ASC`,
    fromDate,
    toDate
  );
  return rows.map((r) => ({ date: r.date, calories: r.calories ?? 0, netCarbs: r.net_carbs ?? 0 }));
}

/** Most recently logged food-database ids, newest first. */
export async function getRecentFoodIds(db: SQLiteDatabase, limit: number): Promise<string[]> {
  const rows = await db.getAllAsync<{ food_id: string }>(
    `SELECT food_id FROM food_entries WHERE food_id IS NOT NULL
     GROUP BY food_id ORDER BY MAX(time_iso) DESC LIMIT ?`,
    limit
  );
  return rows.map((r) => r.food_id);
}

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

export async function deleteFoodEntry(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM food_entries WHERE id = ?', id);
}

export async function getEntriesForDate(db: SQLiteDatabase, date: string): Promise<FoodEntry[]> {
  const rows = await db.getAllAsync('SELECT * FROM food_entries WHERE date = ? ORDER BY time_iso DESC', date);
  return rows.map(mapFoodRow);
}

export async function getDailyTotals(db: SQLiteDatabase, date: string): Promise<MacroTotals> {
  const row = await db.getFirstAsync<any>(
    `SELECT
       COALESCE(SUM(calories), 0) as calories,
       COALESCE(SUM(protein), 0) as protein,
       COALESCE(SUM(fat), 0) as fat,
       COALESCE(SUM(carbs), 0) as carbs,
       COALESCE(SUM(fiber), 0) as fiber,
       COALESCE(SUM(net_carbs), 0) as net_carbs
     FROM food_entries WHERE date = ?`,
    date
  );
  return {
    calories: row?.calories ?? 0,
    protein: row?.protein ?? 0,
    fat: row?.fat ?? 0,
    carbs: row?.carbs ?? 0,
    fiber: row?.fiber ?? 0,
    netCarbs: row?.net_carbs ?? 0,
  };
}

export async function getAllFoodEntries(db: SQLiteDatabase): Promise<FoodEntry[]> {
  const rows = await db.getAllAsync('SELECT * FROM food_entries ORDER BY date ASC, time_iso ASC');
  return rows.map(mapFoodRow);
}

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

export async function insertHydrationEntry(db: SQLiteDatabase, entry: NewHydrationEntry) {
  await db.runAsync(
    `INSERT INTO hydration_entries (date, time_iso, water_ml, sodium_mg, potassium_mg, magnesium_mg)
     VALUES (?, ?, ?, ?, ?, ?)`,
    entry.date,
    entry.timeIso,
    entry.waterMl,
    entry.sodiumMg,
    entry.potassiumMg,
    entry.magnesiumMg
  );
}

export async function getHydrationForDate(db: SQLiteDatabase, date: string): Promise<HydrationEntry[]> {
  const rows = await db.getAllAsync('SELECT * FROM hydration_entries WHERE date = ? ORDER BY time_iso DESC', date);
  return rows.map(mapHydrationRow);
}

export async function getHydrationTotals(db: SQLiteDatabase, date: string): Promise<HydrationTotals> {
  const row = await db.getFirstAsync<any>(
    `SELECT
       COALESCE(SUM(water_ml), 0) as water_ml,
       COALESCE(SUM(sodium_mg), 0) as sodium_mg,
       COALESCE(SUM(potassium_mg), 0) as potassium_mg,
       COALESCE(SUM(magnesium_mg), 0) as magnesium_mg
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
