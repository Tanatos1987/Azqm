import React from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { IconButton, Screen, Txt } from '@/components/ui';
import { ChevronLeftIcon } from '@/components/icons';
import { DietPicker } from '@/components/DietPicker';
import { useSettings } from '@/context/SettingsContext';
import { useProfile } from '@/context/ProfileContext';
import { useToast } from '@/context/ToastContext';
import { getDiet, type DietId } from '@/data/diets';
import { useTheme } from '@/theme/ThemeContext';
import { useI18n } from '@/i18n';

export default function DietScreen() {
  const t = useTheme();
  const { dietId } = useSettings();
  const { applyDiet } = useProfile();
  const toast = useToast();
  const { tr } = useI18n();

  const select = (id: DietId) => {
    const diet = getDiet(id);
    const apply = async () => {
      await applyDiet(id);
      toast.show(diet.noCalories ? tr(`Режим: ${diet.name}`, `Plan: ${diet.name}`) : tr(`Режим: ${diet.name}. Целите са преизчислени.`, `Plan: ${diet.name}. Your targets have been recalculated.`));
      router.back();
    };
    if (diet.warning) {
      Alert.alert(diet.name, diet.warning, [
        { text: tr('Отказ', 'Cancel'), style: 'cancel' },
        { text: tr('Разбирам, избери', 'Got it, choose'), onPress: apply },
      ]);
    } else {
      apply();
    }
  };

  return (
    <Screen
      title={tr('Хранителен режим', 'Eating plan')}
      scroll
      left={
        <IconButton onPress={() => router.back()} accessibilityLabel={tr('Назад', 'Back')}>
          <ChevronLeftIcon size={24} color={t.c.text} />
        </IconButton>
      }
    >
      <Txt v="small" tone="textMuted" style={{ marginBottom: 14 }}>
        {tr(
          'Режимът определя разпределението на калориите (протеин / мазнини / въглехидрати), лимита за въглехидрати и кои храни са отбелязани като подходящи. Докосни режим, за да прочетеш правилата.',
          'Your plan sets how calories are split (protein / fat / carbs), the carb limit and which foods are marked as a good fit. Tap a plan to read its rules.',
        )}
      </Txt>
      <DietPicker value={dietId} onSelect={select} />
    </Screen>
  );
}
