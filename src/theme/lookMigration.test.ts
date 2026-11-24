import { describe, expect, test } from '@jest/globals';
import { migrateLook, pickTheme } from './lookMigration';

// Owner, 24.11.2026 (option A): people on the old default move to Deep Glass once and see a note with a way
// back; a theme someone picked is never changed.
describe('migrateLook', () => {
  test('moves the old default to Deep Glass once, with the note', () => {
    expect(migrateLook({ themeId: 'obsidian_amber' })).toEqual({ themeId: 'deep_glass', lookVersion: 2, showLookNote: true });
  });

  test('never moves a light Classic user to the dark Deep Glass', () => {
    expect(migrateLook({ themeId: 'classic', themePref: 'light' })).toEqual({ themeId: undefined, lookVersion: 2, showLookNote: false });
    expect(migrateLook({ themePref: 'light' })).toEqual({ themeId: undefined, lookVersion: 2, showLookNote: false });
  });

  test('keeps a theme the user picked', () => {
    expect(migrateLook({ themeId: 'glass_elegance' })).toEqual({ themeId: undefined, lookVersion: 2, showLookNote: false });
  });

  test('does nothing a second time (the user went back to the old look)', () => {
    expect(migrateLook({ themeId: 'obsidian_amber', lookVersion: 2 })).toEqual({ themeId: undefined, lookVersion: 2, showLookNote: false });
  });

  // Settings saved before themes (1.5.0) have no theme: 1.5.x showed them the old default (light ones: Classic).
  test('settings saved before themes count as the old default', () => {
    expect(migrateLook({})).toEqual({ themeId: 'deep_glass', lookVersion: 2, showLookNote: true });
    expect(migrateLook({ themePref: 'dark' })).toEqual({ themeId: 'deep_glass', lookVersion: 2, showLookNote: true });
    expect(migrateLook({ themeId: 'gone_theme' })).toEqual({ themeId: 'deep_glass', lookVersion: 2, showLookNote: true });
  });
});

// A theme the user picks in Settings → Themes ends the one-time note, so its "Back to the old look" cannot undo the pick.
describe('pickTheme', () => {
  test('picking any theme hides the new-look note', () => {
    expect(pickTheme('glass_elegance')).toEqual({ themeId: 'glass_elegance', showLookNote: false });
    expect(pickTheme('deep_glass')).toEqual({ themeId: 'deep_glass', showLookNote: false });
  });
});
