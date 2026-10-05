import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { useDataRefresh } from '@/context/DataRefreshContext';
import { FOODS } from '@/data/foods';
import { getCustomFoods, getFavoriteIds, getFoodUseCounts, getRecentFoodIds, setFavorite } from '@/db/queries';
import type { FoodItem } from '@/types';
import { shiftDateKey, todayKey } from '@/utils/date';

/** All pickable foods (custom + database) with favorites, recents and usage counts. */
export function useFoodLibrary() {
  const db = useSQLiteContext();
  const { version, bump } = useDataRefresh();
  const [custom, setCustom] = useState<FoodItem[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set());
  const [recent, setRecent] = useState<string[]>([]);
  const [counts, setCounts] = useState<Map<string, number>>(() => new Map());

  useEffect(() => {
    let alive = true;
    Promise.all([getCustomFoods(db), getFavoriteIds(db), getRecentFoodIds(db, 30), getFoodUseCounts(db, shiftDateKey(todayKey(), -90))]).then(([c, f, r, u]) => {
      if (!alive) return;
      setCustom(c);
      setFavorites(new Set(f));
      setRecent(r);
      setCounts(u);
    });
    return () => {
      alive = false;
    };
  }, [db, version]);

  const all = useMemo(() => [...custom, ...FOODS], [custom]);
  const byId = useMemo(() => new Map(all.map((f) => [f.id, f])), [all]);
  const getFood = useCallback((id: string | null | undefined) => (id ? byId.get(id) : undefined), [byId]);

  const toggleFavorite = useCallback(
    async (id: string) => {
      const on = !favorites.has(id);
      setFavorites((prev) => {
        const next = new Set(prev);
        if (on) next.add(id);
        else next.delete(id);
        return next;
      });
      await setFavorite(db, id, on);
      bump();
    },
    [db, favorites, bump]
  );

  return { all, custom, favorites, recent, counts, getFood, toggleFavorite };
}
