import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Button, Card, IconButton, Input, Row, Screen, SectionHeader, Sheet, Txt } from '@/components/ui';
import { ChevronLeftIcon, CloseIcon, PlusIcon, SearchIcon, TrashIcon } from '@/components/icons';
import { ProLock } from '@/components/ProLock';
import { useDataRefresh } from '@/context/DataRefreshContext';
import { usePro } from '@/context/ProContext';
import { useToast } from '@/context/ToastContext';
import { useFoodLibrary } from '@/hooks/useFoodLibrary';
import { defaultPortion, searchFoods } from '@/data/foods';
import { netCarbsOf } from '@/data/nutrients';
import { deleteRecipe, getRecipe, saveRecipe } from '@/db/queries';
import { makeStyles, useTheme } from '@/theme/ThemeContext';
import type { FoodItem, RecipeItem } from '@/types';
import { formatNumber } from '@/utils/date';
import { recipeTotals, recipesTeaser } from '@/utils/recipes';
import { useI18n } from '@/i18n';

const num = (s: string) => Number(s.replace(',', '.'));

/** Builds or edits one of my dishes (Pro); `?id=` edits an existing one. */
export default function RecipeScreen() {
  const t = useTheme();
  const s = useStyles();
  const db = useSQLiteContext();
  const { tr } = useI18n();
  const toast = useToast();
  const { isPro } = usePro();
  const { bump } = useDataRefresh();
  const lib = useFoodLibrary();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [name, setName] = useState('');
  const [items, setItems] = useState<RecipeItem[]>([]);
  /** Grams as typed, per ingredient row. */
  const [gramsText, setGramsText] = useState<string[]>([]);
  const [servings, setServings] = useState('1');
  const [cooked, setCooked] = useState('');
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!id) return;
    getRecipe(db, id).then((r) => {
      if (!r) return;
      setName(r.name);
      setItems(r.items);
      setGramsText(r.items.map((it) => formatNumber(it.grams)));
      setServings(formatNumber(r.servings, 1));
      setCooked(r.cookedGrams ? formatNumber(r.cookedGrams) : '');
    });
  }, [db, id]);

  // A dish can't contain itself.
  const pool = useMemo(() => lib.all.filter((f) => f.id !== id), [lib.all, id]);
  const results = useMemo(() => (query.trim() ? searchFoods(query, pool, { limit: 40 }) : []), [query, pool]);

  const current = items.map((it, i) => ({ ...it, grams: num(gramsText[i] ?? '') || 0 }));
  const servingsN = num(servings) > 0 ? num(servings) : 1;
  const cookedN = num(cooked) > 0 ? num(cooked) : null;
  const totals = recipeTotals({ items: current, servings: servingsN, cookedGrams: cookedN });

  const back = (
    <IconButton onPress={() => router.back()} accessibilityLabel={tr('Назад', 'Back')}>
      <ChevronLeftIcon size={24} color={t.c.text} />
    </IconButton>
  );

  if (!isPro) {
    return (
      <Screen title={tr('Ново ястие', 'New dish')} scroll left={back}>
        <ProLock emoji="🍲" title={tr('Мои ястия', 'My dishes')} text={recipesTeaser()} />
      </Screen>
    );
  }

  const addFood = (f: FoodItem) => {
    const grams = defaultPortion(f).grams;
    setItems((prev) => [...prev, { foodId: f.id, name: f.name, grams, per100: f.per100, hasMicros: f.hasMicros }]);
    setGramsText((prev) => [...prev, formatNumber(grams)]);
    setPicking(false);
    setQuery('');
  };

  const removeItem = (i: number) => {
    setItems((prev) => prev.filter((_, j) => j !== i));
    setGramsText((prev) => prev.filter((_, j) => j !== i));
  };

  const save = async () => {
    const title = name.trim();
    if (!title) {
      Alert.alert(tr('Липсва име', 'Name missing'), tr('Дай име на ястието.', 'Give the dish a name.'));
      return;
    }
    if (current.length === 0 || current.some((it) => !(it.grams > 0))) {
      Alert.alert(tr('Съставки', 'Ingredients'), tr('Добави поне един продукт и грамаж на всеки.', 'Add at least one ingredient, each with an amount.'));
      return;
    }
    await saveRecipe(db, { id, name: title, servings: servingsN, cookedGrams: cookedN, items: current }, { per100: totals.per100, servingGrams: totals.servingGrams, hasMicros: totals.hasMicros });
    bump();
    toast.show(tr('Ястието е запазено — намираш го в „Мои храни“', 'Dish saved — you’ll find it in “My foods”'));
    router.back();
  };

  const remove = () =>
    Alert.alert(tr('Изтриване', 'Delete'), tr('Да изтрия ли ястието „{name}“? Вече добавените в дневника порции остават.', 'Delete the dish “{name}”? Servings already in your diary stay.', { name }), [
      { text: tr('Отказ', 'Cancel'), style: 'cancel' },
      {
        text: tr('Изтрий', 'Delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteRecipe(db, id!);
          bump();
          router.back();
        },
      },
    ]);

  const macros = (n: typeof totals.perServing) =>
    tr('{kcal} ккал · Б {p} г · М {f} г · В {c} г', '{kcal} kcal · P {p} g · F {f} g · C {c} g', {
      kcal: formatNumber(n.kcal),
      p: formatNumber(n.protein),
      f: formatNumber(n.fat),
      c: formatNumber(n.carbs),
    });

  return (
    <Screen title={id ? tr('Ястие', 'Dish') : tr('Ново ястие', 'New dish')} scroll left={back}>
      <Input value={name} onChangeText={setName} placeholder={tr('Име, напр. Мусака на мама', 'Name, e.g. Mum’s moussaka')} style={{ marginBottom: 14 }} />

      <SectionHeader title={tr('Съставки', 'Ingredients')} />
      <Card style={{ gap: 12 }}>
        {current.length === 0 && (
          <Txt tone="textMuted">{tr('Добави продуктите със суровите им грамажи.', 'Add the ingredients with their raw amounts.')}</Txt>
        )}
        {current.map((it, i) => (
          <Row key={`${it.foodId}-${i}`} gap={10}>
            <View style={{ flex: 1 }}>
              <Txt v="bodyStrong" numberOfLines={2}>
                {lib.getFood(it.foodId)?.name ?? it.name}
              </Txt>
              <Txt v="caption" tone="textMuted">
                {formatNumber((it.per100.kcal * it.grams) / 100)} {tr('ккал', 'kcal')}
              </Txt>
            </View>
            <Input
              value={gramsText[i] ?? ''}
              onChangeText={(v) => setGramsText((prev) => prev.map((g, j) => (j === i ? v : g)))}
              keyboardType="decimal-pad"
              style={{ width: 84, textAlign: 'center' }}
            />
            <Txt v="small" tone="textMuted">
              {tr('г', 'g')}
            </Txt>
            <Pressable onPress={() => removeItem(i)} hitSlop={10} accessibilityLabel={tr('Махни', 'Remove')}>
              <TrashIcon size={20} color={t.c.textFaint} />
            </Pressable>
          </Row>
        ))}
        <Button label={tr('Добави продукт', 'Add an ingredient')} variant="secondary" icon={<PlusIcon size={20} color={t.c.text} />} onPress={() => setPicking(true)} />
      </Card>

      <SectionHeader title={tr('Порции', 'Servings')} />
      <Card style={{ gap: 12 }}>
        <Row gap={12}>
          <Txt style={{ flex: 1 }}>{tr('Брой порции', 'Number of servings')}</Txt>
          <Input value={servings} onChangeText={setServings} keyboardType="decimal-pad" style={{ width: 84, textAlign: 'center' }} />
        </Row>
        <Row gap={12}>
          <View style={{ flex: 1 }}>
            <Txt>{tr('Тегло на готовото ястие (г)', 'Weight of the finished dish (g)')}</Txt>
            <Txt v="caption" tone="textMuted">
              {tr('По желание: при готвене водата се изпарява или попива. Празно = сборът на продуктите.', 'Optional: cooking boils water off or soaks it up. Empty = the ingredients added up.')}
            </Txt>
          </View>
          <Input value={cooked} onChangeText={setCooked} keyboardType="decimal-pad" placeholder={formatNumber(totals.rawGrams)} style={{ width: 84, textAlign: 'center' }} />
        </Row>
      </Card>

      {current.length > 0 && (
        <Card style={{ gap: 6, backgroundColor: t.c.accentSoft }}>
          <Txt v="bodyStrong">{tr('Една порция ≈ {g} г', 'One serving ≈ {g} g', { g: formatNumber(totals.servingGrams) })}</Txt>
          <Txt>{macros(totals.perServing)}</Txt>
          <Txt v="small" tone="textMuted">
            {tr('На 100 г', 'Per 100 g')}: {macros(totals.per100)} · {tr('нетни въгл. {c} г', 'net carbs {c} g', { c: formatNumber(netCarbsOf(totals.per100)) })}
          </Txt>
        </Card>
      )}

      <Button label={tr('Запази ястието', 'Save the dish')} onPress={save} style={{ marginTop: 6 }} />
      {id ? <Button label={tr('Изтрий ястието', 'Delete the dish')} variant="danger" onPress={remove} style={{ marginTop: 10 }} /> : null}

      <Sheet visible={picking} onClose={() => setPicking(false)} title={tr('Добави продукт', 'Add an ingredient')}>
        <View style={s.searchBox}>
          <SearchIcon size={20} color={t.c.textMuted} />
          <Input value={query} onChangeText={setQuery} placeholder={tr('Търси: ориз, пиле, домат…', 'Search: rice, chicken, tomato…')} autoFocus autoCorrect={false} style={s.searchInput} />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={10}>
              <CloseIcon size={18} color={t.c.textMuted} />
            </Pressable>
          ) : null}
        </View>
        {results.map((f) => (
          <Pressable key={f.id} onPress={() => addFood(f)} style={({ pressed }) => [s.result, pressed && { opacity: 0.7 }]}>
            <Txt v="bodyStrong" style={{ flex: 1 }} numberOfLines={2}>
              {f.name}
            </Txt>
            <Txt v="caption" tone="textMuted">
              {formatNumber(f.per100.kcal)} {tr('ккал/100 г', 'kcal/100 g')}
            </Txt>
          </Pressable>
        ))}
        {query.trim() !== '' && results.length === 0 && (
          <Txt tone="textMuted" center style={{ paddingVertical: 16 }}>
            {tr('Нищо не е намерено', 'Nothing found')}
          </Txt>
        )}
      </Sheet>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: t.c.surfaceAlt, borderRadius: 16, paddingHorizontal: 12, marginBottom: 8 },
  searchInput: { flex: 1, backgroundColor: 'transparent', borderWidth: 0, paddingHorizontal: 0 },
  result: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: t.c.border },
}));
