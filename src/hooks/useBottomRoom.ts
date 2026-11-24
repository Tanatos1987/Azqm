import { useContext } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { InTabsContext, bottomRoom } from '@/theme/floatingBar';
import { useTheme } from '@/theme/ThemeContext';

/** Extra bottom space a tab screen's content needs to end above Deep Glass's floating tab bar (0 elsewhere). */
export function useBottomRoom(): number {
  const t = useTheme();
  const inTabs = useContext(InTabsContext);
  const insets = useSafeAreaInsets();
  return bottomRoom({ floating: t.fx.tabBar === 'floating', inTabs, insetBottom: insets.bottom });
}
