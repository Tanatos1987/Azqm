import type { SQLiteDatabase } from 'expo-sqlite';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import type { FoodEntry, NutrientKey, UserProfile } from '@/types';
import { exportDatabase, getAllFoodEntries, getAllHydration, getDaySummaries, getFasts, getWeightEntries, type BackupData } from '@/db/queries';
import { NUTRIENT_META, netCarbsOf } from '@/data/nutrients';
import type { AppSettings } from '@/context/SettingsContext';
import { getDiet } from '@/data/diets';
import { ACTIVITY_LEVELS, WEIGHT_GOALS, bmiOf } from './bodyMetrics';
import { buildCsv, buildXlsx, type Cell } from './xlsx';
import { formatTime, mealLabel, todayKey } from './date';

const SOURCE_LABEL: Record<FoodEntry['source'], string> = {
  photo: 'Снимка',
  barcode: 'Баркод',
  manual: 'Ръчно',
  database: 'База храни',
  custom: 'Моя храна',
};

/** Nutrient columns of the diary export (retinol is internal, so it's left out). */
const EXPORT_KEYS: NutrientKey[] = (Object.keys(NUTRIENT_META) as NutrientKey[]).filter((k) => k !== 'retinol');

const r = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d;

function diaryRows(entries: FoodEntry[]): Cell[][] {
  const header: Cell[] = ['Дата', 'Час', 'Хранене', 'Храна', 'Източник', 'Грамаж (г)', ...EXPORT_KEYS.map((k) => `${NUTRIENT_META[k].label} (${NUTRIENT_META[k].unit})`), 'Нетни въглехидрати (г)'];
  return [
    header,
    ...entries.map((e) => [
      e.date,
      formatTime(e.timeIso),
      mealLabel(e.meal),
      e.name,
      SOURCE_LABEL[e.source] ?? e.source,
      e.grams != null ? r(e.grams, 0) : null,
      ...EXPORT_KEYS.map((k) => r(e.n[k], k === 'kcal' ? 0 : 2)),
      r(netCarbsOf(e.n)),
    ]),
  ];
}

async function writeAndShare(name: string, content: string | Uint8Array, mimeType: string, dialogTitle: string) {
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  file.write(content);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType, dialogTitle });
  } else {
    throw new Error('Споделянето на файлове не е налично на това устройство.');
  }
}

export interface ExportContext {
  profile: UserProfile | null;
  settings: AppSettings;
}

/** Excel workbook: diary, daily totals, weight, water & electrolytes, fasts and profile. */
export async function exportExcel(db: SQLiteDatabase, { profile, settings }: ExportContext) {
  const entries = await getAllFoodEntries(db);
  if (entries.length === 0) throw new Error('Дневникът все още е празен.');
  const [days, weights, hydration, fasts] = await Promise.all([
    getDaySummaries(db, '0000-01-01', '9999-12-31'),
    getWeightEntries(db),
    getAllHydration(db),
    getFasts(db, 10000),
  ]);
  const waterByDay = new Map<string, number>();
  for (const h of hydration) waterByDay.set(h.date, (waterByDay.get(h.date) ?? 0) + h.waterMl);
  const diet = getDiet(settings.dietId);

  const data = buildXlsx([
    { name: 'Дневник', rows: diaryRows(entries), widths: [11, 7, 10, 34, 11, 10, ...EXPORT_KEYS.map(() => 12), 12] },
    {
      name: 'По дни',
      widths: [11, 8, 10, 11, 11, 13, 13, 9, 11, 11],
      rows: [
        ['Дата', 'Записи', 'Калории', 'Протеин (г)', 'Мазнини (г)', 'Въглехидрати (г)', 'Нетни въгл. (г)', 'Фибри (г)', 'Натрий (мг)', 'Вода (мл)'],
        ...days.map((d) => [d.date, d.entries, r(d.n.kcal, 0), r(d.n.protein), r(d.n.fat), r(d.n.carbs), r(netCarbsOf(d.n)), r(d.n.fiber), r(d.n.sodium, 0), waterByDay.get(d.date) ?? 0]),
      ],
    },
    {
      name: 'Тегло',
      widths: [11, 11, 8],
      rows: [['Дата', 'Тегло (кг)', 'BMI'], ...weights.map((w) => [w.date, w.weightKg, profile ? r(bmiOf(w.weightKg, profile.heightCm)) : null])],
    },
    {
      name: 'Вода и електролити',
      widths: [11, 7, 10, 11, 10, 12],
      rows: [['Дата', 'Час', 'Вода (мл)', 'Натрий (мг)', 'Калий (мг)', 'Магнезий (мг)'], ...hydration.map((h) => [h.date, formatTime(h.timeIso), h.waterMl, h.sodiumMg, h.potassiumMg, h.magnesiumMg])],
    },
    {
      name: 'Гладувания',
      widths: [18, 18, 16, 9],
      rows: [
        ['Начало', 'Край', 'Продължителност (ч)', 'Цел (ч)'],
        ...fasts.map((f) => [
          new Date(f.startIso).toLocaleString('bg-BG'),
          f.endIso ? new Date(f.endIso).toLocaleString('bg-BG') : '',
          f.endIso ? r((new Date(f.endIso).getTime() - new Date(f.startIso).getTime()) / 3600000) : null,
          f.goalHours,
        ]),
      ],
    },
    {
      name: 'Профил',
      widths: [26, 30],
      rows: [
        ['Показател', 'Стойност'],
        ['Хранителен режим', diet.name],
        ['Цел калории (ккал)', settings.goals.calories],
        ['Цел протеин (г)', settings.goals.protein],
        ['Цел мазнини (г)', settings.goals.fat],
        [diet.carbBasis === 'net' ? 'Цел нетни въглехидрати (г)' : 'Цел въглехидрати (г)', settings.goals.carbs],
        ['Пол', profile ? (profile.sex === 'male' ? 'Мъж' : 'Жена') : ''],
        ['Възраст', profile?.age ?? ''],
        ['Ръст (см)', profile?.heightCm ?? ''],
        ['Тегло (кг)', profile?.weightKg ?? ''],
        ['Целево тегло (кг)', profile?.targetWeightKg ?? ''],
        ['Активност', ACTIVITY_LEVELS.find((a) => a.value === profile?.activity)?.label ?? ''],
        ['Цел', WEIGHT_GOALS.find((g) => g.value === profile?.goal)?.label ?? ''],
        ['Експортирано на', new Date().toLocaleString('bg-BG')],
        ['Източник на данните за храните', 'USDA FoodData Central (SR Legacy); ястията — по типични рецепти'],
      ],
    },
  ]);
  await writeAndShare(`azqm-dnevnik-${todayKey()}.xlsx`, data, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Експорт към Excel');
}

export async function exportCsv(db: SQLiteDatabase) {
  const entries = await getAllFoodEntries(db);
  if (entries.length === 0) throw new Error('Дневникът все още е празен.');
  await writeAndShare(`azqm-dnevnik-${todayKey()}.csv`, buildCsv(diaryRows(entries)), 'text/csv', 'Експорт на дневника (CSV)');
}

export interface BackupFile {
  db: BackupData;
  settings: AppSettings;
  profile: UserProfile | null;
}

export async function exportBackup(db: SQLiteDatabase, { profile, settings }: ExportContext) {
  const backup: BackupFile = { db: await exportDatabase(db), settings, profile };
  await writeAndShare(`azqm-backup-${todayKey()}.json`, JSON.stringify(backup), 'application/json', 'Резервно копие на Azqm');
}

/** Lets the user pick a backup file; null when cancelled. */
export async function pickBackup(): Promise<BackupFile | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true, multiple: false });
  if (res.canceled || !res.assets?.[0]) return null;
  const text = await new File(res.assets[0].uri).text();
  let parsed: BackupFile;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Файлът не е валиден JSON.');
  }
  if (parsed?.db?.app !== 'azqm') throw new Error('Файлът не е резервно копие на Azqm.');
  return parsed;
}
