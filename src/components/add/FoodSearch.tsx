import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, View } from 'react-native';
import { Chip, EmptyState, Input, Sheet, Txt } from '@/components/ui';
import { CloseIcon, SearchIcon } from '@/components/icons';
import { FoodRow } from '@/components/food/FoodRow';
import { AmountEditor } from '@/components/food/AmountEditor';
import { useSettings } from '@/context/SettingsContext';
import { useFoodLibrary } from '@/hooks/useFoodLibrary';
import { useLogFood } from '@/hooks/useLogFood';
import { getDiet } from '@/data/diets';
import { FOOD_CATEGORIES, defaultPortion, searchFoods } from '@/data/foods';
import { makeStyles, useTheme } from '@/theme/ThemeContext';
import type { FoodCategory, FoodItem } from '@/types';
import { mealForNow } from '@/utils/date';

type ListMode = 'all' | 'favorites' | 'recent' | FoodCategory;

const isCategory = (m: ListMode): m is FoodCategory => m !== 'all' && m !== 'favorites' && m !== 'recent';

export function FoodSearch({ onManual }: { onManual: () => void }) {
  const t = useTheme();
  const s = useStyles();
  const lib = useFoodLibrary();
  const { dietId } = useSettings();
  const diet = getDiet(dietId);
  const { logFood } = useLogFood();
  const [query, setQuery] = useState('');
  const [modeState, setMode] = useState<ListMode | null>(null);
  const [onlyFit, setOnlyFit] = useState(false);
  const [selected, setSelected] = useState<FoodItem | null>(null);

  // Until the user picks a list, open on "Последни" when there are any.
  const mode: ListMode = modeState ?? (lib.recent.length > 0 ? 'recent' : 'all');
  const { favorites, counts, getFood, all, recent } = lib;

  const boost = useCallback((f: FoodItem) => (favorites.has(f.id) ? 3 : 0) + Math.min(counts.get(f.id) ?? 0, 10) * 0.4, [favorites, counts]);

  const results = useMemo(() => {
    let list: FoodItem[];
    if (query.trim()) {
      const pool = mode === 'favorites' ? all.filter((f) => favorites.has(f.id)) : all;
      list = searchFoods(query, pool, { category: isCategory(mode) ? mode : null, boost, limit: 120 });
    } else if (mode === 'recent') {
      list = recent.map((id) => getFood(id)).filter((f): f is FoodItem => !!f);
    } else if (mode === 'favorites') {
      list = all.filter((f) => favorites.has(f.id));
    } else {
      list = searchFoods('', all, { category: isCategory(mode) ? mode : null, boost, limit: 2000 });
    }
    return onlyFit ? list.filter((f) => f.custom || diet.fit(f) !== 'avoid') : list;
  }, [query, mode, all, favorites, recent, getFood, boost, onlyFit, diet]);

  const quickAdd = useCallback((f: FoodItem) => logFood(f, defaultPortion(f).grams, mealForNow()), [logFood]);

  const modes: { key: ListMode; label: string }[] = [
    { key: 'recent', label: '🕑 Последни' },
    { key: 'favorites', label: '⭐ Любими' },
    { key: 'all', label: 'Всички' },
    ...FOOD_CATEGORIES.filter((c) => c.key !== 'custom' || lib.custom.length > 0).map((c) => ({ key: c.key as ListMode, label: `${c.emoji} ${c.label}` })),
  ];

  return (
    <View style={{ flex: 1 }}>
      <View style={s.searchBox}>
        <SearchIcon size={22} color={t.c.textMuted} />
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="Търси: сирене, яйце, баница…"
          autoCorrect={false}
          returnKeyType="search"
          style={s.searchInput}
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={10}>
            <CloseIcon size={20} color={t.c.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={s.chips} keyboardShouldPersistTaps="handled">
        <Chip label={onlyFit ? '✓ Подходящи' : 'Подходящи'} active={onlyFit} onPress={() => setOnlyFit((v) => !v)} color={t.c.success} />
        {modes.map((m) => (
          <Chip key={m.key} label={m.label} active={mode === m.key} onPress={() => setMode(m.key)} />
        ))}
      </ScrollView>

      <FlatList
        data={results}
        keyExtractor={(f) => f.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={12}
        windowSize={9}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => (
          <FoodRow
            food={item}
            diet={diet}
            favorite={favorites.has(item.id)}
            onPress={() => setSelected(item)}
            onQuickAdd={() => quickAdd(item)}
            onToggleFavorite={() => lib.toggleFavorite(item.id)}
          />
        )}
        ListHeaderComponent={
          !query && mode === 'all' ? (
            <Txt v="caption" tone="textMuted" style={{ marginBottom: 10 }}>
              {all.length} храни · „+“ добавя една порция веднага, докосване на реда — избор на количество. Цветната точка показва дали храната е подходяща за режима.
            </Txt>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            emoji={mode === 'favorites' ? '⭐' : mode === 'recent' ? '🕑' : '🔎'}
            title={mode === 'favorites' && !query ? 'Още нямаш любими храни' : mode === 'recent' && !query ? 'Още няма записани храни' : 'Нищо не е намерено'}
            text={
              mode === 'favorites' && !query
                ? 'Натисни звездичката до храна, за да я добавиш тук.'
                : 'Опитай с друга дума или въведи храната ръчно — можеш да я запазиш като „Моя храна“.'
            }
          >
            <Pressable onPress={onManual} style={{ marginTop: 10 }}>
              <Txt v="bodyStrong" tone="accent">
                Въведи ръчно →
              </Txt>
            </Pressable>
          </EmptyState>
        }
      />

      <Sheet visible={selected != null} onClose={() => setSelected(null)}>
        {selected && (
          <AmountEditor
            food={selected}
            initialGrams={defaultPortion(selected).grams}
            initialMeal={mealForNow()}
            primaryLabel="Добави"
            hideFit={selected.custom}
            onSubmit={async ({ grams, meal }) => {
              await logFood(selected, grams, meal);
              setSelected(null);
            }}
          />
        )}
      </Sheet>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: t.c.surface,
    borderRadius: 18,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: t.c.border,
  },
  searchInput: { flex: 1, backgroundColor: 'transparent', borderWidth: 0, paddingHorizontal: 0, paddingVertical: 14 },
  chips: { gap: 8, paddingVertical: 12 },
}));
