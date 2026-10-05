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

export default function DietScreen() {
  const t = useTheme();
  const { dietId } = useSettings();
  const { applyDiet } = useProfile();
  const toast = useToast();

  const select = (id: DietId) => {
    const diet = getDiet(id);
    const apply = async () => {
      await applyDiet(id);
      toast.show(diet.noCalories ? `Режим: ${diet.name}` : `Режим: ${diet.name}. Целите са преизчислени.`);
      router.back();
    };
    if (diet.warning) {
      Alert.alert(diet.name, diet.warning, [
        { text: 'Отказ', style: 'cancel' },
        { text: 'Разбирам, избери', onPress: apply },
      ]);
    } else {
      apply();
    }
  };

  return (
    <Screen
      title="Хранителен режим"
      scroll
      left={
        <IconButton onPress={() => router.back()} accessibilityLabel="Назад">
          <ChevronLeftIcon size={24} color={t.c.text} />
        </IconButton>
      }
    >
      <Txt v="small" tone="textMuted" style={{ marginBottom: 14 }}>
        Режимът определя разпределението на калориите (протеин / мазнини / въглехидрати), лимита за въглехидрати и кои храни са отбелязани като подходящи. Докосни
        режим, за да прочетеш правилата.
      </Txt>
      <DietPicker value={dietId} onSelect={select} />
    </Screen>
  );
}
