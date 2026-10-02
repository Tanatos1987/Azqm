import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import type { FoodEntry } from '@/types';
import { formatTime } from '@/utils/date';
import { BarcodeIcon, CameraIcon, ManualEntryIcon, SearchIcon, TrashIcon } from './icons';

const SOURCE_ICON: Record<FoodEntry['source'], (props: { size: number; color: string }) => React.JSX.Element> = {
  photo: CameraIcon,
  barcode: BarcodeIcon,
  manual: ManualEntryIcon,
  database: SearchIcon,
};

interface FoodEntryRowProps {
  entry: FoodEntry;
  onDelete: (id: number) => void;
}

export function FoodEntryRow({ entry, onDelete }: FoodEntryRowProps) {
  const SourceIcon = SOURCE_ICON[entry.source];
  return (
    <View style={styles.row}>
      <View style={styles.iconWrap}>
        <SourceIcon size={17} color={colors.accent} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {entry.name}
        </Text>
        <Text style={styles.meta}>
          {formatTime(entry.timeIso)}
          {entry.grams ? ` · ${Math.round(entry.grams)} г` : ''} · {Math.round(entry.calories)} ккал
        </Text>
        <Text style={styles.macros}>
          Б {Math.round(entry.protein)}г · М {Math.round(entry.fat)}г · НВ {Math.round(entry.netCarbs)}г
        </Text>
      </View>
      <Pressable hitSlop={10} onPress={() => onDelete(entry.id)} style={styles.deleteBtn}>
        <TrashIcon size={17} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  name: { color: colors.text, fontWeight: '600', fontSize: 14 },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  macros: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  deleteBtn: { padding: 6 },
});
