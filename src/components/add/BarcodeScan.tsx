import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useSQLiteContext } from 'expo-sqlite';
import { colors } from '@/theme/colors';
import { useDataRefresh } from '@/context/DataRefreshContext';
import { lookupBarcode } from '@/api/openFoodFacts';
import { insertFoodEntry } from '@/db/queries';
import { netCarbsOf, scalePer100g } from '@/utils/nutrition';
import type { OffLookupResult } from '@/types';
import { todayKey } from '@/utils/date';
import { CheckIcon } from '../icons';

export function BarcodeScan() {
  const db = useSQLiteContext();
  const { bump } = useDataRefresh();
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<OffLookupResult | null>(null);
  const [grams, setGrams] = useState('100');

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
        <Text style={styles.infoText}>Нужен е достъп до камерата за баркод скенера.</Text>
        <Pressable style={styles.primaryBtn} onPress={requestPermission}>
          <Text style={styles.primaryBtnText}>Разреши достъп</Text>
        </Pressable>
      </View>
    );
  }

  const reset = () => {
    setScannedCode(null);
    setProduct(null);
    setGrams('100');
  };

  const handleScanned = async ({ data }: BarcodeScanningResult) => {
    if (scannedCode) return;
    setScannedCode(data);
    setLoading(true);
    try {
      const found = await lookupBarcode(data);
      if (!found) {
        Alert.alert('Не е намерен продукт', `Баркод ${data} не е в базата на OpenFoodFacts.`);
        setScannedCode(null);
        return;
      }
      setProduct(found);
      setGrams(String(found.servingGrams ?? 100));
    } catch (err: any) {
      Alert.alert('Грешка', err?.message ?? String(err));
      setScannedCode(null);
    } finally {
      setLoading(false);
    }
  };

  const gramsNum = Number(grams.replace(',', '.')) || 0;
  const scaled = product ? scalePer100g(product.per100g, gramsNum) : null;

  const save = async () => {
    if (!product || !scaled) return;
    await insertFoodEntry(db, {
      date: todayKey(),
      timeIso: new Date().toISOString(),
      name: product.name,
      source: 'barcode',
      grams: gramsNum || null,
      calories: scaled.calories,
      protein: scaled.protein,
      fat: scaled.fat,
      carbs: scaled.carbs,
      fiber: scaled.fiber,
      netCarbs: netCarbsOf(scaled.carbs, scaled.fiber),
    });
    bump();
    Alert.alert('Добавено', `${product.name} е записано в дневника.`);
    reset();
  };

  if (product && scaled) {
    return (
      <View style={styles.resultCard}>
        <Text style={styles.resultTitle}>{product.name}</Text>
        <View style={styles.gramsRow}>
          <Text style={styles.infoText}>Грамаж:</Text>
          <TextInput style={styles.gramsInput} keyboardType="numeric" value={grams} onChangeText={setGrams} />
          <Text style={styles.infoText}>г</Text>
        </View>
        <View style={styles.macroGrid}>
          <MacroStat label="Ккал" value={scaled.calories} />
          <MacroStat label="Протеин" value={scaled.protein} unit="г" />
          <MacroStat label="Мазнини" value={scaled.fat} unit="г" />
          <MacroStat label="Нетни В-ди" value={netCarbsOf(scaled.carbs, scaled.fiber)} unit="г" />
        </View>
        <View style={styles.actionsRow}>
          <Pressable style={styles.secondaryBtn} onPress={reset}>
            <Text style={styles.secondaryBtnText}>Сканирай отново</Text>
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
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] }}
        onBarcodeScanned={scannedCode ? undefined : handleScanned}
      />
      {loading ? (
        <View style={styles.overlay}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.overlayText}>Търся продукта...</Text>
        </View>
      ) : (
        <View style={styles.scanHint}>
          <Text style={styles.overlayText}>Насочи камерата към баркода</Text>
        </View>
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
  infoText: { color: colors.textMuted, fontSize: 14 },
  cameraWrap: { flex: 1, borderRadius: 20, overflow: 'hidden' },
  camera: { flex: 1 },
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
  scanHint: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(21,24,29,0.85)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  resultCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 18 },
  resultTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 12 },
  gramsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  gramsInput: {
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    width: 80,
    textAlign: 'center',
  },
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
