import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { Button, Card, Txt } from '@/components/ui';
import { CameraIcon } from '@/components/icons';
import { AmountEditor } from '@/components/food/AmountEditor';
import { useSettings } from '@/context/SettingsContext';
import { useLogFood } from '@/hooks/useLogFood';
import { analyzeFoodPhoto } from '@/api/visionClient';
import { fillNutrients } from '@/data/nutrients';
import { useTheme } from '@/theme/ThemeContext';
import type { FoodItem } from '@/types';
import { mealForNow } from '@/utils/date';
import { useI18n } from '@/i18n';

export function PhotoCapture() {
  const t = useTheme();
  const { tr } = useI18n();
  const { apiKey, visionProvider, visionModel, hasApiKey } = useSettings();
  const { logEntry } = useLogFood();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<{ food: FoodItem; grams: number } | null>(null);

  if (!hasApiKey) {
    return (
      <Card style={{ marginTop: 12, gap: 12 }}>
        <Txt v="h3">{tr('Разпознаване по снимка', 'Photo recognition')}</Txt>
        <Txt tone="textMuted">
          {tr(
            'Тази функция изпраща снимката към изкуствен интелект (Google Gemini или OpenAI) и иска личен API ключ. Без ключ използвай търсенето в базата — тя работи без интернет.',
            'This feature sends the photo to an AI (Google Gemini or OpenAI) and needs your own API key. Without a key, use the database search — it works offline.',
          )}
        </Txt>
        <Button label={tr('Добави API ключ в Настройки', 'Add an API key in Settings')} onPress={() => router.push('/settings')} />
      </Card>
    );
  }

  if (!permission) return <ActivityIndicator color={t.c.accent} style={{ marginTop: 40 }} />;

  if (!permission.granted) {
    return (
      <Card style={{ marginTop: 12, alignItems: 'center', gap: 12 }}>
        <Txt center>{tr('Нужен е достъп до камерата, за да снимаш храната.', 'Camera access is needed to photograph your food.')}</Txt>
        <Button label={tr('Разреши достъп', 'Allow access')} onPress={requestPermission} />
      </Card>
    );
  }

  const takePicture = async () => {
    const photo = await cameraRef.current?.takePictureAsync({ base64: true, quality: 0.5 });
    if (!photo?.base64) return;
    setAnalyzing(true);
    try {
      const a = await analyzeFoodPhoto({ provider: visionProvider, apiKey, model: visionModel, base64Image: photo.base64 });
      const grams = a.estimatedGrams > 0 ? a.estimatedGrams : 100;
      const f = 100 / grams;
      setResult({
        grams,
        food: {
          id: 'photo',
          name: a.foodName,
          category: 'custom',
          tags: [],
          aliases: [],
          portions: [{ label: tr('по снимката', 'from the photo'), grams }],
          hasMicros: false,
          per100: fillNutrients({ kcal: a.calories * f, protein: a.protein * f, fat: a.fat * f, carbs: a.carbs * f, fiber: a.fiber * f }),
          custom: true,
        },
      });
    } catch (err: any) {
      Alert.alert(tr('Грешка при анализа', 'Analysis failed'), err?.message ?? String(err));
    } finally {
      setAnalyzing(false);
    }
  };

  if (result) {
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <Card>
          <AmountEditor
            food={result.food}
            initialGrams={result.grams}
            initialMeal={mealForNow()}
            primaryLabel={tr('Добави', 'Add')}
            hideFit
            onSubmit={async ({ grams, meal, n }) => {
              await logEntry({ meal, name: result.food.name, source: 'photo', grams, foodId: null, hasMicros: false, n });
              setResult(null);
            }}
          >
            <Button label={tr('Нова снимка', 'New photo')} variant="secondary" onPress={() => setResult(null)} style={{ marginTop: 10 }} />
          </AmountEditor>
          <Txt v="caption" tone="textFaint" style={{ marginTop: 12 }}>
            {tr('Оценката по снимка е приблизителна — провери грамажа.', 'The photo estimate is approximate — check the amount.')}
          </Txt>
        </Card>
      </ScrollView>
    );
  }

  return (
    <View style={styles.cameraWrap}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
      {analyzing ? (
        <View style={[styles.overlay, { backgroundColor: t.c.overlay }]}>
          <ActivityIndicator color="#fff" size="large" />
          <Txt v="bodyStrong" color="#FFFFFF">
            {tr('Анализирам снимката…', 'Analyzing the photo…')}
          </Txt>
        </View>
      ) : (
        <Pressable style={[styles.shutter, { backgroundColor: t.c.accent }]} onPress={takePicture} accessibilityLabel={tr('Снимай', 'Take photo')}>
          <CameraIcon size={30} color={t.c.onAccent} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cameraWrap: { flex: 1, borderRadius: 24, overflow: 'hidden', marginTop: 12, marginBottom: 100, backgroundColor: '#000' },
  shutter: { position: 'absolute', bottom: 24, alignSelf: 'center', width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 14 },
});
