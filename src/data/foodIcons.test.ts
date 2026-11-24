import { describe, expect, test } from '@jest/globals';
import { FOOD_CATEGORIES } from './foods';
import { MEALS } from '@/utils/date';
import { THEMES } from '@/theme/themes';
import { contrast, luminance } from '@/theme/contrast.testutil';
import { CATEGORY_ICON, MEAL_ICON, categoryColor, categoryIconKey } from './foodIcons';

// Owner, 24.11.2026 (icons option А + group colours): thin line icons instead of emoji; the group colour only in the
// food-group chips.
describe('food icons', () => {
  test('every food group and every meal has a line icon', () => {
    for (const c of FOOD_CATEGORIES) {
      expect(CATEGORY_ICON[c.key]).toBeTruthy();
      expect(categoryIconKey(c.key)).toBe(CATEGORY_ICON[c.key]);
    }
    for (const m of MEALS) expect(MEAL_ICON[m.key]).toBeTruthy();
  });

  test('an unknown group gets a neutral icon and colour', () => {
    expect(categoryIconKey('unknown')).toBe('utensils');
    expect(categoryColor('unknown')).toMatch(/^#[0-9A-F]{6}$/i);
  });

  test('group colours stay visible on the chips of every theme', () => {
    const bad: string[] = [];
    for (const def of THEMES) {
      for (const scheme of ['dark', 'light'] as const) {
        const c = def.palette[scheme];
        if (!c) continue;
        for (const g of FOOD_CATEGORIES) {
          const color = categoryColor(g.key, scheme);
          const ratio = /^#[0-9A-F]{6}$/i.test(color) ? contrast(luminance(color), luminance(c.surfaceAlt)) : 0;
          if (ratio < 3) bad.push(`${def.id}/${scheme}/${g.key}: ${ratio.toFixed(2)}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
});
