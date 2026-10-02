import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';

interface ScreenContainerProps {
  title?: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function ScreenContainer({ title, subtitle, headerRight, children, style }: ScreenContainerProps) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={[styles.container, style]}>
        {title ? (
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            {headerRight}
          </View>
        ) : null}
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 8, paddingBottom: 12 },
  title: { color: colors.text, fontSize: 24, fontWeight: '700' },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
});
