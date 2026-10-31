import React, { useRef } from 'react';
import { ScrollView, View, type LayoutChangeEvent } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Card, IconButton, Screen, SectionHeader } from '@/components/ui';
import { ChevronLeftIcon, HeartIcon } from '@/components/icons';
import { PerkRow } from '@/components/PerkRow';
import { usePro } from '@/context/ProContext';
import { useTour } from '@/context/TourContext';
import { helpSections } from '@/data/help';
import { useTheme } from '@/theme/ThemeContext';
import { useI18n } from '@/i18n';

/** What every button does; `?section=` (from the ? buttons of the tabs) opens it at that tab's part. */
export default function HelpScreen() {
  const t = useTheme();
  const { tr } = useI18n();
  const tour = useTour();
  const { isPro } = usePro();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const scrollRef = useRef<ScrollView>(null);
  const jumped = useRef(false);

  const onSectionLayout = (key: string) => (e: LayoutChangeEvent) => {
    if (jumped.current || key !== section) return;
    jumped.current = true;
    scrollRef.current?.scrollTo({ y: e.nativeEvent.layout.y, animated: false });
  };

  const replayTour = () => {
    // Back to the Today tab: the tour points at its buttons and at the tab bar.
    router.dismissTo('/');
    tour.start();
  };

  return (
    <Screen
      title={tr('Помощ', 'Help')}
      subtitle={tr('Какво прави всеки бутон', 'What each button does')}
      scroll
      scrollRef={scrollRef}
      left={
        <IconButton onPress={() => router.back()} accessibilityLabel={tr('Назад', 'Back')}>
          <ChevronLeftIcon size={24} color={t.c.text} />
        </IconButton>
      }
    >
      <Button label={tr('Покажи обиколката отново', 'Show the tour again')} variant="secondary" onPress={replayTour} style={{ marginBottom: 6 }} />

      {helpSections().map((sec) => (
        <View key={sec.key} onLayout={onSectionLayout(sec.key)}>
          <SectionHeader title={sec.title} />
          <Card style={{ gap: 14 }}>
            {sec.items.map((item) => (
              <PerkRow key={item.title} {...item} />
            ))}
            {sec.key === 'support' && !isPro && (
              <Button label={tr('Подкрепи Azqm', 'Support Azqm')} icon={<HeartIcon size={20} color={t.c.onAccent} filled />} onPress={() => router.push('/support')} />
            )}
          </Card>
        </View>
      ))}
    </Screen>
  );
}
