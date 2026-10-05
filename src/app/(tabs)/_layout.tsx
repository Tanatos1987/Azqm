import React from 'react';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AddIcon, AnalysisIcon, FastingIcon, ProgressIcon, TodayIcon } from '@/components/icons';
import { FONT, useTheme } from '@/theme/ThemeContext';

export default function TabsLayout() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
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
      <Tabs.Screen name="index" options={{ title: 'Днес', tabBarIcon: ({ color }) => <TodayIcon size={26} color={color} /> }} />
      <Tabs.Screen name="add" options={{ title: 'Добави', tabBarIcon: ({ color }) => <AddIcon size={26} color={color} /> }} />
      <Tabs.Screen name="analysis" options={{ title: 'Анализ', tabBarIcon: ({ color }) => <AnalysisIcon size={26} color={color} /> }} />
      <Tabs.Screen name="progress" options={{ title: 'Прогрес', tabBarIcon: ({ color }) => <ProgressIcon size={26} color={color} /> }} />
      <Tabs.Screen name="fasting" options={{ title: 'Пост', tabBarIcon: ({ color }) => <FastingIcon size={26} color={color} /> }} />
    </Tabs>
  );
}
