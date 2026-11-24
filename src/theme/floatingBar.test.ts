import { describe, expect, test } from '@jest/globals';
import { bottomRoom } from './floatingBar';

// Deep Glass's floating tab bar covers the bottom of the tab screens only; content there needs room to end above it.
describe('bottomRoom', () => {
  test('a screen outside the tabs (no bar under it) gets no extra room', () => {
    expect(bottomRoom({ floating: true, inTabs: false, insetBottom: 24 })).toBe(0);
  });

  test('a theme with the normal tab bar gets none', () => {
    expect(bottomRoom({ floating: false, inTabs: true, insetBottom: 24 })).toBe(0);
  });

  test("a tab screen gets the bar's height plus its distance from the screen edge", () => {
    expect(bottomRoom({ floating: true, inTabs: true, insetBottom: 0 })).toBe(74);
    expect(bottomRoom({ floating: true, inTabs: true, insetBottom: 48 })).toBe(112);
  });
});
