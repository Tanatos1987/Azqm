import { describe, expect, test } from '@jest/globals';
import { DEFAULT_THEME_ID, THEMES, getThemeDef } from './themes';
import { contrast, luminance } from './contrast.testutil';

// Deep Glass (owner, 24.11.2026): the free default look, readable on its see-through cards.
describe('Deep Glass', () => {
  test('is the first, free, default theme', () => {
    expect(THEMES[0].id).toBe('deep_glass');
    expect(DEFAULT_THEME_ID).toBe('deep_glass');
    expect(getThemeDef('deep_glass').isPro).toBe(false);
  });

  test('text stays readable on a glass card', () => {
    const c = getThemeDef('deep_glass').palette.dark!;
    const bg = [1, 3, 5].map((i) => parseInt(c.bg.slice(i, i + 2), 16));
    const m = /rgba\(255,\s*255,\s*255,\s*([\d.]+)\)/.exec(c.card);
    expect(m).not.toBeNull();
    const a = Number(m![1]);
    const card = bg.map((v) => a * 255 + (1 - a) * v) as [number, number, number]; // the white veil over the background
    expect(contrast(luminance(c.text), luminance(card))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(luminance(c.textMuted), luminance(card))).toBeGreaterThanOrEqual(4.5);
  });
});
