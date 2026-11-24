import { describe, expect, test } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { FOOD_CATEGORIES } from './foods';
import { FOOD_PHOTOS, foodPhoto } from './foodPhotos';

// Owner, 24.11.2026: "искам снимки на храненето като икони" — option В, a photo per food group.
describe('food photos', () => {
  test('a food group with a photo shows it', () => {
    expect(foodPhoto('meat')).toBeDefined();
  });

  test('an unknown group has no photo (the row falls back to its line icon)', () => {
    expect(foodPhoto('unknown')).toBeUndefined();
  });

  test('every photo in assets/food belongs to a food group and is wired in', () => {
    const keys = new Set<string>(FOOD_CATEGORIES.map((c) => c.key));
    const files = fs.readdirSync(path.join(__dirname, '../../assets/food')).filter((f) => f.endsWith('.webp'));
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      const key = f.replace(/\.webp$/, '');
      expect(keys.has(key)).toBe(true);
      expect(FOOD_PHOTOS[key as keyof typeof FOOD_PHOTOS]).toBeDefined();
    }
  });
});
