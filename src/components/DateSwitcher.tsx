import React from 'react';
import { Pressable, View } from 'react-native';
import { Txt } from '@/components/ui';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons';
import { useSelectedDate } from '@/context/SelectedDateContext';
import { makeStyles, useTheme } from '@/theme/ThemeContext';
import { formatDateLabel, shiftDateKey, todayKey } from '@/utils/date';

/** ◀ Днес ▶ — changes the diary day shared by "Днес" and "Добави". */
export function DateSwitcher({ compact }: { compact?: boolean }) {
  const t = useTheme();
  const s = useStyles();
  const { date, setDate } = useSelectedDate();
  const isToday = date === todayKey();
  return (
    <View style={s.wrap}>
      <Pressable onPress={() => setDate(shiftDateKey(date, -1))} hitSlop={10} style={s.btn} accessibilityLabel="Предишен ден">
        <ChevronLeftIcon size={22} color={t.c.text} />
      </Pressable>
      <Pressable onPress={() => setDate(todayKey())} hitSlop={6} style={{ minWidth: compact ? 70 : 110, alignItems: 'center' }}>
        <Txt v={compact ? 'smallStrong' : 'bodyStrong'} tone={isToday ? 'text' : 'accent'} numberOfLines={1}>
          {formatDateLabel(date)}
        </Txt>
      </Pressable>
      <Pressable onPress={() => setDate(shiftDateKey(date, 1))} hitSlop={10} style={s.btn} accessibilityLabel="Следващ ден">
        <ChevronRightIcon size={22} color={t.c.text} />
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: t.c.surface, borderRadius: 22, paddingHorizontal: 4, paddingVertical: 2, borderWidth: t.dark ? 0 : 1, borderColor: t.c.border },
  btn: { padding: 8 },
}));
