import React from 'react';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AddIcon, AnalysisIcon, FastingIcon, ProgressIcon, TodayIcon } from '@/components/icons';
import { FONT, useTheme } from '@/theme/ThemeContext';
import { useI18n } from '@/i18n';

export default function TabsLayout() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { tr } = useI18n();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Hidden tabs stay mounted; freezing them stops background re-renders (the fasting clock ticks every second,
        // and every data change would otherwise refetch and redraw all visited tabs), which made switching feel sluggish.
        freezeOnBlur: true,
        tabBarActiveTintColor: t.c.accent,
        tabBarInactiveTintColor: t.c.textMuted,
        tabBarStyle: {
          backgroundColor: t.c.surface,
          borderTopColor: t.c.border,
          height: 64 + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
        },
        tabBarLabelStyle: { fontFamily: FONT, fontSize: 12 * Math.min(t.scale, 1.15), fontWeight: '600' },
        sceneStyle: { backgroundColor: t.c.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: tr('Днес', 'Today'), tabBarIcon: ({ color }) => <TodayIcon size={26} color={color} /> }} />
      <Tabs.Screen name="add" options={{ title: tr('Добави', 'Add'), tabBarIcon: ({ color }) => <AddIcon size={26} color={color} /> }} />
      <Tabs.Screen name="analysis" options={{ title: tr('Анализ', 'Analysis'), tabBarIcon: ({ color }) => <AnalysisIcon size={26} color={color} /> }} />
      <Tabs.Screen name="progress" options={{ title: tr('Прогрес', 'Progress'), tabBarIcon: ({ color }) => <ProgressIcon size={26} color={color} /> }} />
      <Tabs.Screen name="fasting" options={{ title: tr('Пост', 'Fasting'), tabBarIcon: ({ color }) => <FastingIcon size={26} color={color} /> }} />
    </Tabs>
  );
}
