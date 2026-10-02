import type { SQLiteDatabase } from 'expo-sqlite';
import { MICRONUTRIENTS } from '@/data/micronutrients';

const DB_VERSION = 2;

/**
 * Versioned migrations keyed off `PRAGMA user_version`, so existing installs keep
 * their diary and only get the new columns/tables added.
 * Passed as `onInit` to <SQLiteProvider> in src/app/_layout.tsx.
 */
export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  if (version >= DB_VERSION) return;

  if (version === 0) {
    // v1 — the original schema. IF NOT EXISTS because installs from before
    // versioning already have these tables but still report user_version 0.
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS food_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        time_iso TEXT NOT NULL,
        name TEXT NOT NULL,
        source TEXT NOT NULL,
        grams REAL,
        calories REAL NOT NULL DEFAULT 0,
        protein REAL NOT NULL DEFAULT 0,
        fat REAL NOT NULL DEFAULT 0,
        carbs REAL NOT NULL DEFAULT 0,
        fiber REAL NOT NULL DEFAULT 0,
        net_carbs REAL NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_food_entries_date ON food_entries(date);

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
    `);
    version = 1;
  }

  if (version === 1) {
    // v2 — micronutrients + food database id on entries, and a weight log.
    const microColumns = MICRONUTRIENTS.map((m) => `ALTER TABLE food_entries ADD COLUMN ${m.column} REAL NOT NULL DEFAULT 0;`).join('\n');
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        ${microColumns}
        ALTER TABLE food_entries ADD COLUMN food_id TEXT;

        CREATE TABLE IF NOT EXISTS weight_entries (
          date TEXT PRIMARY KEY NOT NULL,
          time_iso TEXT NOT NULL,
          weight_kg REAL NOT NULL
        );
      `);
    });
    version = 2;
  }

  await db.execAsync(`PRAGMA user_version = ${DB_VERSION}`);
}
