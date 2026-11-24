import { describe, expect, test } from '@jest/globals';
import { fatnessOf, measures, silhouette } from './silhouette';

// The realistic figure that replaces the cartoon (owner, 24.11.2026: "away from the childish design").
describe('silhouette', () => {
  test('fatness follows BMI 16..40, clamped', () => {
    expect(fatnessOf(10)).toBe(0);
    expect(fatnessOf(16)).toBe(0);
    expect(fatnessOf(28)).toBeCloseTo(0.5);
    expect(fatnessOf(40)).toBe(1);
    expect(fatnessOf(50)).toBe(1);
  });

  test('a heavier body is wider at the waist', () => {
    expect(measures(35, 'female').waist).toBeGreaterThan(measures(22, 'female').waist);
    expect(measures(22, 'female').waist).toBeGreaterThan(measures(17, 'female').waist);
  });

  test('female and male proportions differ the right way', () => {
    expect(measures(22, 'female').hip).toBeGreaterThan(measures(22, 'female').waist);
    expect(measures(22, 'male').shoulder).toBeGreaterThan(measures(22, 'female').shoulder);
  });

  test('every part is a closed path', () => {
    const s = silhouette(27.7, 'male');
    for (const d of [s.body, s.armL, s.armR]) {
      expect(d.startsWith('M')).toBe(true);
      expect(d.endsWith('Z')).toBe(true);
    }
    expect(s.head.rx).toBeGreaterThan(0);
  });
});
