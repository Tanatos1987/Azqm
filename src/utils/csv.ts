import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { FoodEntry } from '@/types';
import { MICRONUTRIENTS } from '@/data/micronutrients';

const SOURCE_LABEL: Record<FoodEntry['source'], string> = {
  photo: 'Снимка',
  barcode: 'Баркод',
  manual: 'Ръчно',
  database: 'База храни',
};

function escapeCsvValue(value: string | number): string {
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function buildFoodEntriesCsv(entries: FoodEntry[]): string {
  const header = [
    'Дата',
    'Час',
    'Име',
    'Източник',
    'Грамаж (г)',
    'Калории',
    'Протеин (г)',
    'Мазнини (г)',
    'Въглехидрати (г)',
    'Фибри (г)',
    'Нетни въглехидрати (г)',
    ...MICRONUTRIENTS.map((m) => `${m.label} (${m.unit})`),
  ];
  const rows = entries.map((e) =>
    [
      e.date,
      new Date(e.timeIso).toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' }),
      e.name,
      SOURCE_LABEL[e.source],
      e.grams ?? '',
      e.calories,
      e.protein,
      e.fat,
      e.carbs,
      e.fiber,
      e.netCarbs,
      ...MICRONUTRIENTS.map((m) => e.micros[m.key]),
    ]
      .map(escapeCsvValue)
      .join(',')
  );
  return [header.join(','), ...rows].join('\n');
}

/** Writes the CSV to the app cache directory and opens the native share sheet. Returns the file URI. */
export async function exportAndShareCsv(csv: string, filename: string): Promise<string> {
  const file = new File(Paths.cache, filename);
  if (file.exists) {
    file.delete();
  }
  file.create();
  file.write(csv);

  const available = await Sharing.isAvailableAsync();
  if (available) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/csv',
      dialogTitle: 'Експорт на хранителен дневник',
    });
  }
  return file.uri;
}
