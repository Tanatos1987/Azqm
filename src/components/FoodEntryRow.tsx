import React from 'react';
import { Pressable, View } from 'react-native';
import { Txt } from '@/components/ui';
import { BarcodeIcon, CameraIcon, ManualEntryIcon, SearchIcon, StarIcon } from './icons';
import { MacroLine } from './food/FoodBits';
import { makeStyles, useTheme } from '@/theme/ThemeContext';
import type { FoodEntry } from '@/types';
import { formatNumber, formatTime } from '@/utils/date';

const SOURCE_ICON = {
  photo: CameraIcon,
  barcode: BarcodeIcon,
  manual: ManualEntryIcon,
  database: SearchIcon,
  custom: StarIcon,
} as const;

interface FoodEntryRowProps {
  entry: FoodEntry;
  carbBasis: 'net' | 'total';
  onPress: (entry: FoodEntry) => void;
}

export const FoodEntryRow = React.memo(function FoodEntryRow({ entry, carbBasis, onPress }: FoodEntryRowProps) {
  const t = useTheme();
  const s = useStyles();
  const SourceIcon = SOURCE_ICON[entry.source] ?? SearchIcon;
  return (
    <Pressable onPress={() => onPress(entry)} style={({ pressed }) => [s.row, pressed && { opacity: 0.85 }]}>
      <View style={s.icon}>
        <SourceIcon size={18} color={t.c.accent} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Txt v="bodyStrong" numberOfLines={2}>
          {entry.name}
        </Txt>
        <Txt v="caption" tone="textMuted">
          {formatTime(entry.timeIso)}
          {entry.grams ? ` · ${formatNumber(entry.grams)} г` : ''}
        </Txt>
        <MacroLine n={entry.n} carbBasis={carbBasis} />
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Txt v="h3">{formatNumber(entry.n.kcal)}</Txt>
        <Txt v="caption" tone="textMuted">
          ккал
        </Txt>
      </View>
    </Pressable>
  );
});

const useStyles = makeStyles((t) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: t.c.border,
  },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.c.accentSoft, alignItems: 'center', justifyContent: 'center' },
}));
