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
import { entryDisplayName } from './entryName';
import { locale, tr } from '@/i18n';

/** Sheet names, headers and labels follow the current UI language (JSON backup keys never change). */
const sourceLabel = (source: FoodEntry['source']): string =>
  ({
    photo: tr('Снимка', 'Photo'),
    barcode: tr('Баркод', 'Barcode'),
    manual: tr('Ръчно', 'Manual'),
    database: tr('База храни', 'Food database'),
    custom: tr('Моя храна', 'My food'),
  })[source] ?? source;

/** Nutrient columns of the diary export (retinol is internal, so it's left out). */
const EXPORT_KEYS: NutrientKey[] = (Object.keys(NUTRIENT_META) as NutrientKey[]).filter((k) => k !== 'retinol');

const r = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d;

function diaryRows(entries: FoodEntry[]): Cell[][] {
  const header: Cell[] = [
    tr('Дата', 'Date'),
    tr('Час', 'Time'),
    tr('Хранене', 'Meal'),
    tr('Храна', 'Food'),
    tr('Източник', 'Source'),
    tr('Грамаж (г)', 'Amount (g)'),
    ...EXPORT_KEYS.map((k) => `${NUTRIENT_META[k].label} (${NUTRIENT_META[k].unit})`),
    tr('Нетни въглехидрати (г)', 'Net carbs (g)'),
  ];
  return [
    header,
    ...entries.map((e) => [
      e.date,
      formatTime(e.timeIso),
      mealLabel(e.meal),
      entryDisplayName(e),
      sourceLabel(e.source),
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
    throw new Error(tr('Споделянето на файлове не е налично на това устройство.', 'File sharing is not available on this device.'));
  }
}

export interface ExportContext {
  profile: UserProfile | null;
  settings: AppSettings;
}

/** Excel workbook: diary, daily totals, weight, water & electrolytes, fasts and profile. */
export async function exportExcel(db: SQLiteDatabase, { profile, settings }: ExportContext) {
  const entries = await getAllFoodEntries(db);
  if (entries.length === 0) throw new Error(tr('Дневникът все още е празен.', 'Your diary is still empty.'));
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
    { name: tr('Дневник', 'Diary'), rows: diaryRows(entries), widths: [11, 7, 10, 34, 11, 10, ...EXPORT_KEYS.map(() => 12), 12] },
    {
      name: tr('По дни', 'By day'),
      widths: [11, 8, 10, 11, 11, 13, 13, 9, 11, 11],
      rows: [
        [
          tr('Дата', 'Date'),
          tr('Записи', 'Entries'),
          tr('Калории', 'Calories'),
          tr('Протеин (г)', 'Protein (g)'),
          tr('Мазнини (г)', 'Fat (g)'),
          tr('Въглехидрати (г)', 'Carbs (g)'),
          tr('Нетни въгл. (г)', 'Net carbs (g)'),
          tr('Фибри (г)', 'Fiber (g)'),
          tr('Натрий (мг)', 'Sodium (mg)'),
          tr('Вода (мл)', 'Water (ml)'),
        ],
        ...days.map((d) => [d.date, d.entries, r(d.n.kcal, 0), r(d.n.protein), r(d.n.fat), r(d.n.carbs), r(netCarbsOf(d.n)), r(d.n.fiber), r(d.n.sodium, 0), waterByDay.get(d.date) ?? 0]),
      ],
    },
    {
      name: tr('Тегло', 'Weight'),
      widths: [11, 11, 8],
      rows: [[tr('Дата', 'Date'), tr('Тегло (кг)', 'Weight (kg)'), 'BMI'], ...weights.map((w) => [w.date, w.weightKg, profile ? r(bmiOf(w.weightKg, profile.heightCm)) : null])],
    },
    {
      name: tr('Вода и електролити', 'Water & electrolytes'),
      widths: [11, 7, 10, 11, 10, 12],
      rows: [
        [tr('Дата', 'Date'), tr('Час', 'Time'), tr('Вода (мл)', 'Water (ml)'), tr('Натрий (мг)', 'Sodium (mg)'), tr('Калий (мг)', 'Potassium (mg)'), tr('Магнезий (мг)', 'Magnesium (mg)')],
        ...hydration.map((h) => [h.date, formatTime(h.timeIso), h.waterMl, h.sodiumMg, h.potassiumMg, h.magnesiumMg]),
      ],
    },
    {
      name: tr('Гладувания', 'Fasts'),
      widths: [18, 18, 16, 9],
      rows: [
        [tr('Начало', 'Start'), tr('Край', 'End'), tr('Продължителност (ч)', 'Duration (h)'), tr('Цел (ч)', 'Goal (h)')],
        ...fasts.map((f) => [
          new Date(f.startIso).toLocaleString(locale()),
          f.endIso ? new Date(f.endIso).toLocaleString(locale()) : '',
          f.endIso ? r((new Date(f.endIso).getTime() - new Date(f.startIso).getTime()) / 3600000) : null,
          f.goalHours,
        ]),
      ],
    },
    {
      name: tr('Профил', 'Profile'),
      widths: [26, 30],
      rows: [
        [tr('Показател', 'Field'), tr('Стойност', 'Value')],
        [tr('Хранителен режим', 'Diet'), diet.name],
        [tr('Цел калории (ккал)', 'Calorie goal (kcal)'), settings.goals.calories],
        [tr('Цел протеин (г)', 'Protein goal (g)'), settings.goals.protein],
        [tr('Цел мазнини (г)', 'Fat goal (g)'), settings.goals.fat],
        [diet.carbBasis === 'net' ? tr('Цел нетни въглехидрати (г)', 'Net carb goal (g)') : tr('Цел въглехидрати (г)', 'Carb goal (g)'), settings.goals.carbs],
        [tr('Пол', 'Sex'), profile ? (profile.sex === 'male' ? tr('Мъж', 'Male') : tr('Жена', 'Female')) : ''],
        [tr('Възраст', 'Age'), profile?.age ?? ''],
        [tr('Ръст (см)', 'Height (cm)'), profile?.heightCm ?? ''],
        [tr('Тегло (кг)', 'Weight (kg)'), profile?.weightKg ?? ''],
        [tr('Целево тегло (кг)', 'Target weight (kg)'), profile?.targetWeightKg ?? ''],
        [tr('Активност', 'Activity'), ACTIVITY_LEVELS.find((a) => a.value === profile?.activity)?.label ?? ''],
        [tr('Цел', 'Goal'), WEIGHT_GOALS.find((g) => g.value === profile?.goal)?.label ?? ''],
        [tr('Експортирано на', 'Exported on'), new Date().toLocaleString(locale())],
        [
          tr('Източник на данните за храните', 'Food data source'),
          tr('USDA FoodData Central (SR Legacy); ястията — по типични рецепти', 'USDA FoodData Central (SR Legacy); dishes are based on typical recipes'),
        ],
      ],
    },
  ]);
  await writeAndShare(
    `${tr('azqm-dnevnik', 'azqm-diary')}-${todayKey()}.xlsx`,
    data,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    tr('Експорт към Excel', 'Export to Excel')
  );
}

export async function exportCsv(db: SQLiteDatabase) {
  const entries = await getAllFoodEntries(db);
  if (entries.length === 0) throw new Error(tr('Дневникът все още е празен.', 'Your diary is still empty.'));
  await writeAndShare(`${tr('azqm-dnevnik', 'azqm-diary')}-${todayKey()}.csv`, buildCsv(diaryRows(entries)), 'text/csv', tr('Експорт на дневника (CSV)', 'Export diary (CSV)'));
}

export interface BackupFile {
  db: BackupData;
  settings: AppSettings;
  profile: UserProfile | null;
}

export async function exportBackup(db: SQLiteDatabase, { profile, settings }: ExportContext) {
  const backup: BackupFile = { db: await exportDatabase(db), settings, profile };
  await writeAndShare(`azqm-backup-${todayKey()}.json`, JSON.stringify(backup), 'application/json', tr('Резервно копие на Azqm', 'Azqm backup'));
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
    throw new Error(tr('Файлът не е валиден JSON.', 'The file is not valid JSON.'));
  }
  if (parsed?.db?.app !== 'azqm') throw new Error(tr('Файлът не е резервно копие на Azqm.', 'The file is not an Azqm backup.'));
  return parsed;
}
