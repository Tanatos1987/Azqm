import { createContext } from 'react';

/** Deep Glass's floating tab bar (fx.tabBar 'floating'): its size and where it sits. */
export const FLOATING_BAR = { height: 64, side: 12, minBottom: 10, radius: 26 } as const;

/** True inside the tab screens ((tabs)/_layout.tsx provides it); screens opened on top of the tabs have no bar. */
export const InTabsContext = createContext(false);

/**
 * Room the floating bar takes at the bottom of a tab screen — its height plus its distance from the screen edge — so
 * content can end above it. Screens outside the tabs, and themes with the normal bar, need none.
 */
export function bottomRoom(o: { floating: boolean; inTabs: boolean; insetBottom: number }): number {
  return o.floating && o.inTabs ? FLOATING_BAR.height + Math.max(o.insetBottom, FLOATING_BAR.minBottom) : 0;
}
