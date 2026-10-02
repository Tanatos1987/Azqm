import React from 'react';
import { Tabs } from 'expo-router';
import { colors } from '@/theme/colors';
import { AddIcon, FastingIcon, ProgressIcon, SettingsIcon, TodayIcon } from '@/components/icons';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Днес', tabBarIcon: ({ color, size }) => <TodayIcon size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="add"
        options={{ title: 'Добави', tabBarIcon: ({ color, size }) => <AddIcon size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="progress"
        options={{ title: 'Прогрес', tabBarIcon: ({ color, size }) => <ProgressIcon size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="fasting"
        options={{ title: 'Пост', tabBarIcon: ({ color, size }) => <FastingIcon size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Настройки', tabBarIcon: ({ color, size }) => <SettingsIcon size={size} color={color} /> }}
      />
    </Tabs>
  );
}
