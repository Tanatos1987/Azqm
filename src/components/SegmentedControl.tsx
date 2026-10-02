import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';

interface Option<T extends string> {
  label: string;
  value: T;
}

interface SegmentedControlProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <View style={styles.wrap}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable key={opt.value} onPress={() => onChange(opt.value)} style={[styles.segment, active && styles.segmentActive]}>
            <Text style={[styles.label, active && styles.labelActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 12, padding: 4, marginBottom: 16 },
  segment: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  segmentActive: { backgroundColor: colors.accent },
  label: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
  labelActive: { color: colors.bg },
});
