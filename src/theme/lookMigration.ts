import { isThemeId, type ThemeId } from './themes';

/**
 * The 24.11.2026 redesign (owner's option A): whoever is still on the old default, Obsidian Amber, moves to the new
 * default Deep Glass once and sees a note on Today with a way back. A theme someone picked is never changed, and
 * after this ran once (lookVersion 2) going back to Obsidian Amber sticks. Settings saved before themes (1.5.0), or
 * with a theme that no longer exists, count as the old default: 1.5.x showed them Obsidian Amber (light: Classic).
 */
export const LOOK_VERSION = 2;

export interface LookMigration {
  /** the theme to switch to; undefined keeps what is saved */
  themeId: ThemeId | undefined;
  lookVersion: typeof LOOK_VERSION;
  showLookNote: boolean;
}

export function migrateLook(saved: { themeId?: unknown; themePref?: unknown; lookVersion?: unknown }): LookMigration {
  const onOldDefault = saved.themeId === 'obsidian_amber' || (!isThemeId(saved.themeId) && saved.themePref !== 'light');
  const due = saved.lookVersion !== LOOK_VERSION && onOldDefault;
  return { themeId: due ? 'deep_glass' : undefined, lookVersion: LOOK_VERSION, showLookNote: due };
}

/** A theme picked in Settings → Themes ends the one-time note, so its "Back to the old look" cannot undo the pick. */
export function pickTheme(id: ThemeId): { themeId: ThemeId; showLookNote: boolean } {
  return { themeId: id, showLookNote: false };
}
