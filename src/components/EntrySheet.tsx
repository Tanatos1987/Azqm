import React, { useMemo } from 'react';
import { Alert } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Button, Sheet } from '@/components/ui';
import { CopyIcon, TrashIcon } from '@/components/icons';
import { AmountEditor } from '@/components/food/AmountEditor';
import { useDataRefresh } from '@/context/DataRefreshContext';
import { useToast } from '@/context/ToastContext';
import { useFoodLibrary } from '@/hooks/useFoodLibrary';
import { deleteFoodEntry, insertFoodEntry, updateFoodEntry } from '@/db/queries';
import { NUTRIENT_KEYS } from '@/data/nutrients';
import { useTheme } from '@/theme/ThemeContext';
import type { FoodEntry, FoodItem, Nutrients } from '@/types';
import { entryTimeIso, todayKey } from '@/utils/date';

/** Edit an existing diary entry: change grams or meal, log it again, or delete it. */
export function EntrySheet({ entry, onClose }: { entry: FoodEntry | null; onClose: () => void }) {
  const t = useTheme();
  const db = useSQLiteContext();
  const { bump } = useDataRefresh();
  const toast = useToast();
  const { getFood } = useFoodLibrary();

  // The original food when it's still known; otherwise rebuild per-100 g values from the entry itself.
  const food = useMemo<FoodItem | null>(() => {
    if (!entry) return null;
    const known = getFood(entry.foodId);
    if (known) return known;
    const grams = entry.grams && entry.grams > 0 ? entry.grams : 100;
    const per100 = {} as Nutrients;
    for (const k of NUTRIENT_KEYS) per100[k] = (entry.n[k] * 100) / grams;
    return {
      id: `entry-${entry.id}`,
      name: entry.name,
      category: 'custom',
      tags: [],
      aliases: [],
      portions: [{ label: entry.grams ? 'записано' : '1 порция', grams }],
      hasMicros: entry.hasMicros,
      per100,
      custom: true,
    };
  }, [entry, getFood]);

  if (!entry || !food) return <Sheet visible={false} onClose={onClose}>{null}</Sheet>;

  const remove = () =>
    Alert.alert('Изтриване', `Да изтрия ли „${entry.name}“?`, [
      { text: 'Отказ', style: 'cancel' },
      {
        text: 'Изтрий',
        style: 'destructive',
        onPress: async () => {
          await deleteFoodEntry(db, entry.id);
          bump();
          onClose();
        },
      },
    ]);

  const again = async () => {
    const date = todayKey();
    const { id: _id, ...rest } = entry;
    await insertFoodEntry(db, { ...rest, date, timeIso: entryTimeIso(date) });
    bump();
    toast.show(`Добавено отново за днес: ${entry.name}`);
    onClose();
  };

  return (
    <Sheet visible onClose={onClose}>
      <AmountEditor
        food={food}
        initialGrams={entry.grams && entry.grams > 0 ? entry.grams : 100}
        initialMeal={entry.meal}
        primaryLabel="Запази"
        hideFit={food.custom}
        onSubmit={async ({ grams, meal, n }) => {
          await updateFoodEntry(db, entry.id, { grams: entry.grams == null && grams === 100 ? null : grams, meal, n });
          bump();
          onClose();
        }}
      >
        <Button label="Добави отново за днес" variant="secondary" icon={<CopyIcon size={20} color={t.c.text} />} onPress={again} style={{ marginTop: 10 }} />
        <Button label="Изтрий записа" variant="danger" icon={<TrashIcon size={20} color={t.c.danger} />} onPress={remove} style={{ marginTop: 10 }} />
      </AmountEditor>
    </Sheet>
  );
}
