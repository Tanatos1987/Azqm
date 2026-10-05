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
import { entryDisplayName } from '@/utils/entryName';
import { useI18n } from '@/i18n';

/** Edit an existing diary entry: change grams or meal, log it again, or delete it. */
export function EntrySheet({ entry, onClose }: { entry: FoodEntry | null; onClose: () => void }) {
  const t = useTheme();
  const db = useSQLiteContext();
  const { bump } = useDataRefresh();
  const toast = useToast();
  const { getFood } = useFoodLibrary();
  const { lang, tr } = useI18n();

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
      portions: [{ label: entry.grams ? tr('записано', 'logged') : tr('1 порция', '1 serving'), grams }],
      hasMicros: entry.hasMicros,
      per100,
      custom: true,
    };
    // lang: the fallback portion label is translated.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry, getFood, lang]);

  if (!entry || !food) return <Sheet visible={false} onClose={onClose}>{null}</Sheet>;

  const remove = () =>
    Alert.alert(tr('Изтриване', 'Delete'), tr(`Да изтрия ли „${entryDisplayName(entry)}“?`, `Delete “${entryDisplayName(entry)}”?`), [
      { text: tr('Отказ', 'Cancel'), style: 'cancel' },
      {
        text: tr('Изтрий', 'Delete'),
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
    toast.show(tr(`Добавено отново за днес: ${entryDisplayName(entry)}`, `Logged again for today: ${entryDisplayName(entry)}`));
    onClose();
  };

  return (
    <Sheet visible onClose={onClose}>
      <AmountEditor
        food={food}
        initialGrams={entry.grams && entry.grams > 0 ? entry.grams : 100}
        initialMeal={entry.meal}
        primaryLabel={tr('Запази', 'Save')}
        hideFit={food.custom}
        onSubmit={async ({ grams, meal, n }) => {
          await updateFoodEntry(db, entry.id, { grams: entry.grams == null && grams === 100 ? null : grams, meal, n });
          bump();
          onClose();
        }}
      >
        <Button label={tr('Добави отново за днес', 'Log again for today')} variant="secondary" icon={<CopyIcon size={20} color={t.c.text} />} onPress={again} style={{ marginTop: 10 }} />
        <Button label={tr('Изтрий записа', 'Delete entry')} variant="danger" icon={<TrashIcon size={20} color={t.c.danger} />} onPress={remove} style={{ marginTop: 10 }} />
      </AmountEditor>
    </Sheet>
  );
}
