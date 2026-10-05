import type { SQLiteDatabase } from 'expo-sqlite';
import { NUTRIENT_KEYS } from '@/data/nutrients';

const DB_VERSION = 1;

export const nutrientColumn = (key: string) => `n_${key}`;
const NUTRIENT_COLUMNS_SQL = NUTRIENT_KEYS.map((k) => `${nutrientColumn(k)} REAL NOT NULL DEFAULT 0`).join(',\n        ');

/**
 * Versioned migrations keyed off `PRAGMA user_version`. Passed as `onInit` to <SQLiteProvider>.
 * Nutrient columns are also added on every start if the nutrient list grew (see ensureNutrientColumns),
 * so adding a nutrient never needs a hand-written migration.
 */
export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;

  if (version < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS food_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        time_iso TEXT NOT NULL,
        meal TEXT NOT NULL DEFAULT 'snack',
        name TEXT NOT NULL,
        source TEXT NOT NULL,
        grams REAL,
        food_id TEXT,
        has_micros INTEGER NOT NULL DEFAULT 0,
        ${NUTRIENT_COLUMNS_SQL}
      );
      CREATE INDEX IF NOT EXISTS idx_food_entries_date ON food_entries(date);

      CREATE TABLE IF NOT EXISTS custom_foods (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        portion_label TEXT,
        portion_grams REAL,
        has_micros INTEGER NOT NULL DEFAULT 0,
        created_iso TEXT NOT NULL,
        ${NUTRIENT_COLUMNS_SQL}
      );

      CREATE TABLE IF NOT EXISTS favorites (
        food_id TEXT PRIMARY KEY NOT NULL,
        created_iso TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS weight_entries (
        date TEXT PRIMARY KEY NOT NULL,
        time_iso TEXT NOT NULL,
        weight_kg REAL NOT NULL
      );

      CREATE TABLE IF NOT EXISTS hydration_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        time_iso TEXT NOT NULL,
        water_ml REAL NOT NULL DEFAULT 0,
        sodium_mg REAL NOT NULL DEFAULT 0,
        potassium_mg REAL NOT NULL DEFAULT 0,
        magnesium_mg REAL NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_hydration_entries_date ON hydration_entries(date);

      CREATE TABLE IF NOT EXISTS fasts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        start_iso TEXT NOT NULL,
        end_iso TEXT,
        goal_hours REAL NOT NULL
      );
    `);
  }

  await ensureNutrientColumns(db, 'food_entries');
  await ensureNutrientColumns(db, 'custom_foods');

  if (version < DB_VERSION) await db.execAsync(`PRAGMA user_version = ${DB_VERSION}`);
}

async function ensureNutrientColumns(db: SQLiteDatabase, table: string) {
  const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  const existing = new Set(cols.map((c) => c.name));
  for (const k of NUTRIENT_KEYS) {
    const col = nutrientColumn(k);
    if (!existing.has(col)) await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${col} REAL NOT NULL DEFAULT 0;`);
  }
}
