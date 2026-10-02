import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SegmentedControl } from '@/components/SegmentedControl';
import { router } from 'expo-router';
import { CheckIcon, ChevronRightIcon, UserIcon } from '@/components/icons';
import { colors } from '@/theme/colors';
import { defaultModelFor, useSettings } from '@/context/SettingsContext';
import { useProfile } from '@/context/ProfileContext';
import { ACTIVITY_LEVELS } from '@/utils/bodyMetrics';
import type { VisionProvider } from '@/types';

export default function SettingsScreen() {
  const {
    loaded,
    visionProvider,
    setVisionProvider,
    visionModel,
    setVisionModel,
    hasApiKey,
    setApiKey,
    clearApiKey,
    goals,
    setGoals,
    fastingGoalHours,
    setFastingGoalHours,
  } = useSettings();
  const { profile } = useProfile();

  const [keyDraft, setKeyDraft] = useState('');
  const [modelDraft, setModelDraft] = useState(visionModel);
  const [goalsDraft, setGoalsDraft] = useState({
    calories: String(goals.calories),
    protein: String(goals.protein),
    fat: String(goals.fat),
    netCarbs: String(goals.netCarbs),
  });
  const [fastingDraft, setFastingDraft] = useState(String(fastingGoalHours));

  // These three effects re-sync the editable draft fields whenever the
  // underlying stored settings change (e.g. once the async AsyncStorage/
  // SecureStore load completes) — an intentional external->local sync, not
  // derived render state, so the set-state-in-effect rule is disabled here.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setModelDraft(visionModel), [visionModel]);
  useEffect(
    () =>
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGoalsDraft({
        calories: String(goals.calories),
        protein: String(goals.protein),
        fat: String(goals.fat),
        netCarbs: String(goals.netCarbs),
      }),
    [goals]
  );
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setFastingDraft(String(fastingGoalHours)), [fastingGoalHours]);

  if (!loaded) return null;

  const handleProviderChange = async (p: VisionProvider) => {
    await setVisionProvider(p);
  };

  const saveKey = async () => {
    if (!keyDraft.trim()) return;
    await setApiKey(keyDraft.trim());
    setKeyDraft('');
    Alert.alert('Запазено', 'API ключът е записан сигурно на устройството (expo-secure-store).');
  };

  const saveModel = async () => {
    await setVisionModel(modelDraft.trim() || defaultModelFor(visionProvider));
  };

  const saveGoals = async () => {
    const num = (v: string, fallback: number) => Number(v.replace(',', '.')) || fallback;
    await setGoals({
      calories: num(goalsDraft.calories, goals.calories),
      protein: num(goalsDraft.protein, goals.protein),
      fat: num(goalsDraft.fat, goals.fat),
      netCarbs: num(goalsDraft.netCarbs, goals.netCarbs),
    });
    Alert.alert('Запазено', 'Дневните цели са обновени.');
  };

  const saveFasting = async () => {
    const h = Number(fastingDraft) || fastingGoalHours;
    await setFastingGoalHours(h);
  };

  return (
    <ScreenContainer title="Настройки">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionTitle}>Профил</Text>
          <Pressable style={[styles.card, styles.profileRow]} onPress={() => router.push('/profile')}>
            <UserIcon size={22} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={styles.profileTitle}>
                {profile ? `${profile.sex === 'male' ? 'Мъж' : 'Жена'}, ${profile.age} г. · ${profile.heightCm} см · ${profile.weightKg} кг` : 'Няма профил'}
              </Text>
              <Text style={styles.hint}>
                {profile ? ACTIVITY_LEVELS.find((a) => a.value === profile.activity)?.label : ''} · Редактирай и преизчисли целите
              </Text>
            </View>
            <ChevronRightIcon size={18} color={colors.textMuted} />
          </Pressable>

          <Text style={styles.sectionTitle}>Vision AI за разпознаване на храна</Text>
          <View style={styles.card}>
            <SegmentedControl<VisionProvider>
              value={visionProvider}
              onChange={handleProviderChange}
              options={[
                { label: 'Gemini Flash', value: 'gemini' },
                { label: 'OpenAI (gpt-4o-mini)', value: 'openai' },
              ]}
            />

            <Text style={styles.label}>Модел</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={modelDraft}
                onChangeText={setModelDraft}
                placeholder={defaultModelFor(visionProvider)}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />
              <Pressable style={styles.smallBtn} onPress={saveModel}>
                <CheckIcon size={16} color={colors.bg} />
              </Pressable>
            </View>

            <Text style={styles.label}>API ключ {hasApiKey ? '(зададен ✓)' : '(няма зададен)'}</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={keyDraft}
                onChangeText={setKeyDraft}
                placeholder="sk-... или AIza..."
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                autoCapitalize="none"
              />
              <Pressable style={styles.smallBtn} onPress={saveKey}>
                <CheckIcon size={16} color={colors.bg} />
              </Pressable>
            </View>
            {hasApiKey && (
              <Pressable onPress={() => clearApiKey()} style={{ marginTop: 8 }}>
                <Text style={styles.linkDanger}>Изтрий записания ключ</Text>
              </Pressable>
            )}
            <Text style={styles.hint}>
              Ключът се съхранява само локално на устройството (expo-secure-store) и се използва единствено за
              директни заявки към избрания доставчик (OpenAI или Google).
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Дневни цели (макронутриенти)</Text>
          <View style={styles.card}>
            <GoalField label="Калории" value={goalsDraft.calories} onChangeText={(v) => setGoalsDraft((p) => ({ ...p, calories: v }))} />
            <GoalField label="Протеин (г)" value={goalsDraft.protein} onChangeText={(v) => setGoalsDraft((p) => ({ ...p, protein: v }))} />
            <GoalField label="Мазнини (г)" value={goalsDraft.fat} onChangeText={(v) => setGoalsDraft((p) => ({ ...p, fat: v }))} />
            <GoalField
              label="Нетни въглехидрати (г)"
              value={goalsDraft.netCarbs}
              onChangeText={(v) => setGoalsDraft((p) => ({ ...p, netCarbs: v }))}
            />
            <Pressable style={styles.saveBtn} onPress={saveGoals}>
              <Text style={styles.saveBtnText}>Запази целите</Text>
            </Pressable>
          </View>

          <Text style={styles.sectionTitle}>OMAD / Пост</Text>
          <View style={styles.card}>
            <Text style={styles.label}>Целеви часове фастинг (напр. 23 за прозорец 23:1)</Text>
            <View style={styles.row}>
              <TextInput style={[styles.input, { flex: 1 }]} value={fastingDraft} onChangeText={setFastingDraft} keyboardType="numeric" />
              <Pressable style={styles.smallBtn} onPress={saveFasting}>
                <CheckIcon size={16} color={colors.bg} />
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function GoalField({ label, value, onChangeText }: { label: string; value: string; onChangeText: (v: string) => void }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} value={value} onChangeText={onChangeText} keyboardType="numeric" />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 10, marginTop: 4 },
  card: { backgroundColor: colors.surface, borderRadius: 18, padding: 16, marginBottom: 20 },
  label: { color: colors.textMuted, fontSize: 12, marginTop: 10, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { backgroundColor: colors.surfaceAlt, color: colors.text, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
  smallBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  linkDanger: { color: colors.danger, fontSize: 12, fontWeight: '600' },
  hint: { color: colors.textMuted, fontSize: 11, marginTop: 12, lineHeight: 16 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  profileTitle: { color: colors.text, fontSize: 14, fontWeight: '600' },
  saveBtn: { backgroundColor: colors.accent, paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 6 },
  saveBtnText: { color: colors.bg, fontWeight: '700', fontSize: 14 },
});
