import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ProgressRing } from './ProgressRing';
import { colors } from '@/theme/colors';

interface MacroRingProps {
  label: string;
  value: number;
  goal: number;
  unit?: string;
  color: string;
  size?: number;
}

export function MacroRing({ label, value, goal, unit = 'г', color, size = 90 }: MacroRingProps) {
  const progress = goal > 0 ? value / goal : 0;
  const over = goal > 0 && value > goal;
  return (
    <View style={styles.container}>
      <ProgressRing size={size} strokeWidth={8} progress={progress} color={over ? colors.warning : color}>
        <Text style={styles.value}>{Math.round(value)}</Text>
        <Text style={styles.unit}>{unit}</Text>
      </ProgressRing>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.goal}>от {Math.round(goal)}{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 2 },
  value: { color: colors.text, fontSize: 19, fontWeight: '700' },
  unit: { color: colors.textMuted, fontSize: 10, marginTop: -2 },
  label: { color: colors.text, fontSize: 13, fontWeight: '600', marginTop: 6 },
  goal: { color: colors.textMuted, fontSize: 11 },
});
