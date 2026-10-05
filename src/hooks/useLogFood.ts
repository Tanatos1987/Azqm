import { useCallback } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { useDataRefresh } from '@/context/DataRefreshContext';
import { useSelectedDate } from '@/context/SelectedDateContext';
import { useToast } from '@/context/ToastContext';
import { deleteFoodEntry, insertFoodEntry } from '@/db/queries';
import { getFoodById } from '@/data/foods';
import { scaleNutrients } from '@/data/nutrients';
import { tr } from '@/i18n';
import type { FoodItem, MealType, NewFoodEntry } from '@/types';
import { entryTimeIso, formatDateLabel, formatNumber, todayKey } from '@/utils/date';

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
      const day = date === todayKey() ? '' : ` (${formatDateLabel(date)})`;
      // The DB keeps the Bulgarian name of built-in foods; the toast shows the current-language one.
      const name = (entry.foodId ? getFoodById(entry.foodId)?.name : undefined) ?? entry.name;
      toast.show({
        message: `${tr('Добавено', 'Added')}${day}: ${name} · ${formatNumber(entry.n.kcal ?? 0)} ${tr('ккал', 'kcal')}`,
        actionLabel: tr('Отмени', 'Undo'),
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
        // Built-in foods are always stored under their Bulgarian name (display goes through food_id).
        name: food.nameBg ?? food.name,
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
