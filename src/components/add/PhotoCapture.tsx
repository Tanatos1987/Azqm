import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSQLiteContext } from 'expo-sqlite';
import { colors } from '@/theme/colors';
import { useSettings } from '@/context/SettingsContext';
import { useDataRefresh } from '@/context/DataRefreshContext';
import { analyzeFoodPhoto } from '@/api/visionClient';
import { insertFoodEntry } from '@/db/queries';
import type { VisionAnalysisResult } from '@/types';
import { todayKey } from '@/utils/date';
import { CameraIcon, CheckIcon } from '../icons';

export function PhotoCapture() {
  const db = useSQLiteContext();
  const { apiKey, visionProvider, visionModel, hasApiKey } = useSettings();
  const { bump } = useDataRefresh();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<VisionAnalysisResult | null>(null);

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.infoText}>Нужен е достъп до камерата, за да разпознаваме храна от снимка.</Text>
        <Pressable style={styles.primaryBtn} onPress={requestPermission}>
          <Text style={styles.primaryBtnText}>Разреши достъп</Text>
        </Pressable>
      </View>
    );
  }

  const reset = () => setResult(null);

  const takePicture = async () => {
    if (!hasApiKey) {
      Alert.alert('Липсва API ключ', 'Добави API ключ за Vision AI в раздел Настройки.');
      return;
    }
    const photo = await cameraRef.current?.takePictureAsync({ base64: true, quality: 0.5 });
    if (!photo?.base64) return;
    setAnalyzing(true);
    try {
      const analysis = await analyzeFoodPhoto({
        provider: visionProvider,
        apiKey,
        model: visionModel,
        base64Image: photo.base64,
      });
      setResult(analysis);
    } catch (err: any) {
      Alert.alert('Грешка при анализ', err?.message ?? String(err));
    } finally {
      setAnalyzing(false);
    }
  };

  const save = async () => {
    if (!result) return;
    await insertFoodEntry(db, {
      date: todayKey(),
      timeIso: new Date().toISOString(),
      name: result.foodName,
      source: 'photo',
      grams: result.estimatedGrams || null,
      calories: result.calories,
      protein: result.protein,
      fat: result.fat,
      carbs: result.carbs,
      fiber: result.fiber,
      netCarbs: result.netCarbs,
    });
    bump();
    Alert.alert('Добавено', `${result.foodName} е записано в дневника.`);
    reset();
  };

  if (result) {
    return (
      <View style={styles.resultCard}>
        <Text style={styles.resultTitle}>{result.foodName}</Text>
        <Text style={styles.resultMeta}>≈ {Math.round(result.estimatedGrams)} г</Text>
        <View style={styles.macroGrid}>
          <MacroStat label="Ккал" value={result.calories} />
          <MacroStat label="Протеин" value={result.protein} unit="г" />
          <MacroStat label="Мазнини" value={result.fat} unit="г" />
          <MacroStat label="Нетни В-ди" value={result.netCarbs} unit="г" />
        </View>
        <View style={styles.actionsRow}>
          <Pressable style={styles.secondaryBtn} onPress={reset}>
            <Text style={styles.secondaryBtnText}>Отказ</Text>
          </Pressable>
          <Pressable style={styles.primaryBtn} onPress={save}>
            <CheckIcon size={18} color={colors.bg} />
            <Text style={styles.primaryBtnText}>Запази</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.cameraWrap}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" />
      {analyzing ? (
        <View style={styles.overlay}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.overlayText}>Анализирам снимката...</Text>
        </View>
      ) : (
        <Pressable style={styles.shutter} onPress={takePicture}>
          <CameraIcon size={26} color={colors.bg} />
        </Pressable>
      )}
    </View>
  );
}

function MacroStat({ label, value, unit = '' }: { label: string; value: number; unit?: string }) {
  return (
    <View style={styles.macroStat}>
      <Text style={styles.macroValue}>
        {Math.round(value)}
        {unit}
      </Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  infoText: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
  cameraWrap: { flex: 1, borderRadius: 20, overflow: 'hidden' },
  camera: { flex: 1 },
  shutter: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11,13,16,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  overlayText: { color: colors.text, fontSize: 14 },
  resultCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 18 },
  resultTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  resultMeta: { color: colors.textMuted, fontSize: 13, marginTop: 2, marginBottom: 14 },
  macroGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  macroStat: { width: '45%' },
  macroValue: { color: colors.text, fontSize: 18, fontWeight: '700' },
  macroLabel: { color: colors.textMuted, fontSize: 12 },
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  primaryBtn: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  primaryBtnText: { color: colors.bg, fontWeight: '700', fontSize: 14 },
  secondaryBtn: {
    backgroundColor: colors.surfaceAlt,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  secondaryBtnText: { color: colors.text, fontWeight: '600', fontSize: 14 },
});
