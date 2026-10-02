import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';

interface ElectrolyteBarProps {
  label: string;
  value: number;
  target: number;
  unit: string;
  color: string;
}

export function ElectrolyteBar({ label, value, target, unit, color }: ElectrolyteBarProps) {
  const pct = target > 0 ? Math.min(value / target, 1) : 0;
  const low = pct < 0.4;
  return (
    <View style={styles.row}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, low && styles.valueLow]}>
          {target < 20 ? value.toFixed(1) : Math.round(value)} / {target} {unit}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: low ? colors.warning : color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: 14 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { color: colors.text, fontSize: 13, fontWeight: '600' },
  value: { color: colors.textMuted, fontSize: 12 },
  valueLow: { color: colors.warning },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
});
