import React from 'react';

/**
 * The same icon in another colour. The app's icons (src/components/icons, lucide) are components with a `color`
 * prop; a glass button (Deep Glass) uses this so icons passed for the old solid button follow its white label.
 */
export function withIconColor(icon: React.ReactNode, color: string): React.ReactNode {
  return React.isValidElement<{ color?: string }>(icon) ? React.cloneElement(icon, { color }) : icon;
}
