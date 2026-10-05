import { useCallback } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { useDataRefresh } from '@/context/DataRefreshContext';
import { useSelectedDate } from '@/context/SelectedDateContext';
import { useToast } from '@/context/ToastContext';
import { deleteFoodEntry, insertFoodEntry } from '@/db/queries';
import { scaleNutrients } from '@/data/nutrients';
import type { FoodItem, MealType, NewFoodEntry } from '@/types';
import { entryTimeIso, formatDateLabel, formatNumber } from '@/utils/date';

/** Writes diary entries for the selected day and shows "Добавено … · Отмени". */
export function useLogFood() {
  const db = useSQLiteContext();
  const { bump } = useDataRefresh();
  const { date } = useSelectedDate();
  const toast = useToast();

  const logEntry = useCallback(
    async (entry: Omit<NewFoodEntry, 'date' | 'timeIso'>) => {
      const id = await insertFoodEntry(db, { ...entry, date, timeIso: entryTimeIso(date) });
      bump();
      const day = formatDateLabel(date);
      toast.show({
        message: `Добавено${day === 'Днес' ? '' : ` (${day})`}: ${entry.name} · ${formatNumber(entry.n.kcal ?? 0)} ккал`,
        actionLabel: 'Отмени',
        onAction: async () => {
          await deleteFoodEntry(db, id);
          bump();
        },
      });
      return id;
    },
    [db, date, bump, toast]
  );

  const logFood = useCallback(
    (food: FoodItem, grams: number, meal: MealType) =>
      logEntry({
        meal,
        name: food.name,
        source: food.custom ? 'custom' : 'database',
        grams,
        foodId: food.id,
        hasMicros: food.hasMicros,
        n: scaleNutrients(food.per100, grams),
      }),
    [logEntry]
  );

  return { logFood, logEntry, date };
}
