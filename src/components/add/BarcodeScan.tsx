import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useSQLiteContext } from 'expo-sqlite';
import { Button, Card, Txt } from '@/components/ui';
import { AmountEditor } from '@/components/food/AmountEditor';
import { lookupBarcode } from '@/api/openFoodFacts';
import { getCustomFoods, saveCustomFood } from '@/db/queries';
import { fillNutrients } from '@/data/nutrients';
import { useLogFood } from '@/hooks/useLogFood';
import { useTheme } from '@/theme/ThemeContext';
import type { FoodItem } from '@/types';
import { mealForNow } from '@/utils/date';

export function BarcodeScan() {
  const t = useTheme();
  const db = useSQLiteContext();
  const { logEntry } = useLogFood();
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<FoodItem | null>(null);

  if (!permission) {
    return <ActivityIndicator color={t.c.accent} style={{ marginTop: 40 }} />;
  }

  if (!permission.granted) {
    return (
      <Card style={{ marginTop: 12, alignItems: 'center', gap: 12 }}>
        <Txt center>Нужен е достъп до камерата, за да сканираш баркода на опаковката.</Txt>
        <Button label="Разреши достъп" onPress={requestPermission} />
      </Card>
    );
  }

  const reset = () => {
    setScannedCode(null);
    setProduct(null);
  };

  const handleScanned = async ({ data }: BarcodeScanningResult) => {
    if (scannedCode) return;
    setScannedCode(data);
    setLoading(true);
    try {
      // Products scanned before are kept in "Мои храни" — works offline the second time.
      const id = `off-${data}`;
      const saved = (await getCustomFoods(db)).find((f) => f.id === id);
      if (saved) {
        setProduct(saved);
        return;
      }
      const found = await lookupBarcode(data);
      if (!found) {
        Alert.alert('Продуктът не е намерен', `Баркод ${data} го няма в OpenFoodFacts. Въведи храната ръчно.`);
        setScannedCode(null);
        return;
      }
      setProduct({
        id,
        name: found.name,
        category: 'custom',
        tags: [],
        aliases: [],
        portions: found.servingGrams ? [{ label: '1 порция', grams: found.servingGrams }] : [],
        hasMicros: false,
        per100: fillNutrients(found.per100),
        custom: true,
      });
    } catch (err: any) {
      Alert.alert('Грешка', `${err?.message ?? err}. Провери връзката с интернет.`);
      setScannedCode(null);
    } finally {
      setLoading(false);
    }
  };

  if (product) {
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <Card>
          <AmountEditor
            food={product}
            initialGrams={product.portions[0]?.grams ?? 100}
            initialMeal={mealForNow()}
            primaryLabel="Добави"
            hideFit
            onSubmit={async ({ grams, meal, n }) => {
              await saveCustomFood(db, { id: product.id, name: product.name, per100: product.per100, portion: product.portions[0] ?? null });
              await logEntry({ meal, name: product.name, source: 'barcode', grams, foodId: product.id, hasMicros: false, n });
              reset();
            }}
          >
            <Button label="Сканирай друг продукт" variant="secondary" onPress={reset} style={{ marginTop: 10 }} />
          </AmountEditor>
          <Txt v="caption" tone="textFaint" style={{ marginTop: 12 }}>
            Данни: OpenFoodFacts (по етикета). Продуктът се запазва в „Мои храни“ и следващия път ще се зарежда и без интернет.
          </Txt>
        </Card>
      </ScrollView>
    );
  }

  return (
    <View style={styles.cameraWrap}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] }}
        onBarcodeScanned={scannedCode ? undefined : handleScanned}
      />
      <View style={styles.frame} pointerEvents="none" />
      <View style={[styles.hint, { backgroundColor: t.c.overlay }]}>
        {loading ? <ActivityIndicator color="#fff" /> : null}
        <Txt v="bodyStrong" color="#FFFFFF" center>
          {loading ? 'Търся продукта…' : 'Насочи камерата към баркода'}
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cameraWrap: { flex: 1, borderRadius: 24, overflow: 'hidden', marginTop: 12, marginBottom: 100, backgroundColor: '#000' },
  frame: {
    position: 'absolute',
    left: '12%',
    right: '12%',
    top: '35%',
    height: '22%',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.85)',
    borderRadius: 18,
  },
  hint: { position: 'absolute', bottom: 20, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20, flexDirection: 'row', gap: 10 },
});
