import React from 'react';
import { Text } from 'react-native';
import { Tabs, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AddIcon, AnalysisIcon, FastingIcon, HeartIcon, ProgressIcon, TodayIcon } from '@/components/icons';
import { usePro } from '@/context/ProContext';
import { TourTarget } from '@/context/TourContext';
import { useTheme } from '@/theme/ThemeContext';
import { useI18n } from '@/i18n';

export default function TabsLayout() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { tr } = useI18n();
  const { isPro, loaded } = usePro();
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
          borderTopColor: t.c.cardBorder,
          height: 64 + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
        },
        // Five tabs share the width: a long translation ("Hinzufügen") shrinks instead of being cut off.
        tabBarLabel: ({ color, children }) => (
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            maxFontSizeMultiplier={1.4}
            style={{ fontFamily: t.font.body, fontSize: 12 * Math.min(t.scale, 1.15), fontWeight: '600', color }}
          >
            {children}
          </Text>
        ),
        sceneStyle: { backgroundColor: t.c.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: tr('Днес', 'Today'), tabBarIcon: ({ color }) => <TodayIcon size={26} color={color} /> }} />
      {/* TourTarget: the first-run tour points at these tabs. */}
      <Tabs.Screen
        name="add"
        options={{
          title: tr('Добави', 'Add'),
          tabBarIcon: ({ color }) => (
            <TourTarget id="tab-add">
              <AddIcon size={26} color={color} />
            </TourTarget>
          ),
        }}
      />
      <Tabs.Screen
        name="analysis"
        options={{
          title: tr('Анализ', 'Analysis'),
          tabBarIcon: ({ color }) => (
            <TourTarget id="tab-analysis">
              <AnalysisIcon size={26} color={color} />
            </TourTarget>
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: tr('Прогрес', 'Progress'),
          tabBarIcon: ({ color }) => (
            <TourTarget id="tab-progress">
              <ProgressIcon size={26} color={color} />
            </TourTarget>
          ),
        }}
      />
      <Tabs.Screen
        name="fasting"
        options={{
          title: tr('Пост', 'Fasting'),
          tabBarIcon: ({ color }) => (
            <TourTarget id="tab-fasting">
              <FastingIcon size={26} color={color} />
            </TourTarget>
          ),
        }}
      />
      {/* Until the user has Pro: a sixth tab, always in the accent colour, that opens the support screen. */}
      <Tabs.Screen
        name="pro"
        options={{
          title: tr('Подкрепи', 'Support'),
          href: loaded && !isPro ? undefined : null,
          tabBarInactiveTintColor: t.c.accent,
          tabBarIcon: () => (
            <TourTarget id="tab-pro">
              <HeartIcon size={26} color={t.c.accent} filled />
            </TourTarget>
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push('/support');
          },
        }}
      />
    </Tabs>
  );
}
