import React, { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Button, Card, EmptyState, IconButton, Row, Screen, Txt } from '@/components/ui';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from '@/components/icons';
import { ProLock } from '@/components/ProLock';
import { useDataRefresh } from '@/context/DataRefreshContext';
import { usePro } from '@/context/ProContext';
import { getRecipes } from '@/db/queries';
import { useTheme } from '@/theme/ThemeContext';
import type { Recipe } from '@/types';
import { recipeTotals, recipesTeaser } from '@/utils/recipes';
import { formatNumber } from '@/utils/date';
import { useI18n } from '@/i18n';

/** My dishes (Pro): the list; each one opens in the editor. The dishes are logged like any food ("My foods"). */
export default function RecipesScreen() {
  const t = useTheme();
  const db = useSQLiteContext();
  const { tr } = useI18n();
  const { isPro } = usePro();
  const { version } = useDataRefresh();
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  const load = useCallback(async () => setRecipes(await getRecipes(db)), [db]);
  useEffect(() => {
    // Refetch whenever data changes; setState happens after the awaited query.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load, version]);

  return (
    <Screen
      title={tr('Мои ястия', 'My dishes')}
      subtitle={isPro ? tr('Сглоби ястие от продукти и го добавяй с едно докосване', 'Build a dish from foods and log it with one tap') : undefined}
      scroll
      left={
        <IconButton onPress={() => router.back()} accessibilityLabel={tr('Назад', 'Back')}>
          <ChevronLeftIcon size={24} color={t.c.text} />
        </IconButton>
      }
    >
      {!isPro ? (
        <ProLock emoji="🍲" title={tr('Мои ястия', 'My dishes')} text={recipesTeaser()} />
      ) : (
        <>
          <Button label={tr('Ново ястие', 'New dish')} icon={<PlusIcon size={22} color={t.c.onAccent} />} onPress={() => router.push('/recipe')} style={{ marginBottom: 14 }} />
          {recipes.length === 0 ? (
            <Card>
              <EmptyState
                emoji="🍲"
                title={tr('Още нямаш ястия', 'No dishes yet')}
                text={tr(
                  'Добави продуктите на мусаката, супата или салатата с грамажите им и броя порции. После ястието е в „Мои храни“ и се добавя като всяка храна.',
                  'Add the ingredients of your stew, soup or salad with their amounts and the number of servings. The dish then sits in “My foods” and is logged like any food.'
                )}
              />
            </Card>
          ) : (
            recipes.map((r) => {
              const totals = recipeTotals(r);
              return (
                <Card key={r.id} onPress={() => router.push({ pathname: '/recipe', params: { id: r.id } })}>
                  <Row gap={12}>
                    <Txt style={{ fontSize: 26 }}>🍲</Txt>
                    <Txt v="bodyStrong" style={{ flex: 1 }}>
                      {r.name}
                    </Txt>
                    <ChevronRightIcon size={20} color={t.c.textMuted} />
                  </Row>
                  <Txt v="small" tone="textMuted" style={{ marginTop: 6 }}>
                    {tr('{n} {n|продукт|продукта} · {s} {s|порция|порции} по {g} г · {kcal} ккал на порция', '{n} {n|ingredient|ingredients} · {s} {s|serving|servings} of {g} g · {kcal} kcal a serving', {
                      n: r.items.length,
                      s: r.servings,
                      g: formatNumber(totals.servingGrams),
                      kcal: formatNumber(totals.perServing.kcal),
                    })}
                  </Txt>
                </Card>
              );
            })
          )}
        </>
      )}
    </Screen>
  );
}
