import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '@/theme/colors';
import { SegmentedControl } from '@/components/SegmentedControl';
import { BodyFigure } from '@/components/BodyFigure';
import { useProfile } from '@/context/ProfileContext';
import { useTween } from '@/hooks/useTween';
import { ACTIVITY_LEVELS, WEIGHT_GOALS, bmiCategory, bmiOf, computeMetrics, healthyWeightRange } from '@/utils/bodyMetrics';
import type { ActivityLevel, Sex, UserProfile, WeightGoal } from '@/types';

interface ProfileFormProps {
  initial: UserProfile | null;
  onSaved: () => void;
}

const NEUTRAL_BMI = 22;

export function ProfileForm({ initial, onSaved }: ProfileFormProps) {
  const [step, setStep] = useState<'form' | 'result'>('form');
  const [sex, setSex] = useState<Sex>(initial?.sex ?? 'female');
  const [age, setAge] = useState(initial ? String(initial.age) : '');
  const [height, setHeight] = useState(initial ? String(initial.heightCm) : '');
  const [weight, setWeight] = useState(initial ? String(initial.weightKg) : '');
  const [target, setTarget] = useState(initial?.targetWeightKg ? String(initial.targetWeightKg) : '');
  const [activity, setActivity] = useState<ActivityLevel>(initial?.activity ?? 'light');
  const [goal, setGoal] = useState<WeightGoal>(initial?.goal ?? 'lose');

  const num = (v: string) => Number(v.replace(',', '.'));
  const liveBmi = num(weight) > 0 && num(height) > 0 ? bmiOf(num(weight), num(height)) : NEUTRAL_BMI;

  const draft: UserProfile = {
    sex,
    age: Math.round(num(age)),
    heightCm: num(height),
    weightKg: num(weight),
    targetWeightKg: target ? num(target) : null,
    activity,
    goal,
  };

  const next = () => {
    if (!(draft.age >= 14 && draft.age <= 100)) return Alert.alert('Възраст', 'Въведи възраст между 14 и 100 години.');
    if (!(draft.heightCm >= 120 && draft.heightCm <= 230)) return Alert.alert('Ръст', 'Въведи ръст в сантиметри (120–230).');
    if (!(draft.weightKg >= 30 && draft.weightKg <= 300)) return Alert.alert('Тегло', 'Въведи тегло в килограми (30–300).');
    if (draft.targetWeightKg != null && !(draft.targetWeightKg >= 30 && draft.targetWeightKg <= 300)) {
      return Alert.alert('Целево тегло', 'Целевото тегло трябва да е между 30 и 300 кг (или остави полето празно).');
    }
    setStep('result');
  };

  if (step === 'result') {
    return <ProfileResult profile={draft} onBack={() => setStep('form')} onSaved={onSaved} />;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={styles.previewCard}>
          <BodyFigure bmi={liveBmi} sex={sex} size={150} />
          <View style={{ flex: 1 }}>
            <Text style={styles.previewTitle}>Твоят профил</Text>
            <Text style={styles.previewText}>
              По тези данни изчисляваме базовия метаболизъм (BMR), дневния разход (TDEE) и личните ти кето макроси.
            </Text>
          </View>
        </View>

        <Text style={styles.label}>Пол</Text>
        <SegmentedControl<Sex>
          value={sex}
          onChange={setSex}
          options={[
            { label: 'Жена', value: 'female' },
            { label: 'Мъж', value: 'male' },
          ]}
        />

        <View style={styles.grid}>
          <NumberField label="Възраст (г.)" value={age} onChangeText={setAge} placeholder="35" />
          <NumberField label="Ръст (см)" value={height} onChangeText={setHeight} placeholder="170" />
          <NumberField label="Тегло (кг)" value={weight} onChangeText={setWeight} placeholder="75" />
          <NumberField label="Целево тегло (кг)" value={target} onChangeText={setTarget} placeholder="по избор" />
        </View>

        <Text style={styles.label}>Ниво на активност</Text>
        {ACTIVITY_LEVELS.map((a) => {
          const active = a.value === activity;
          return (
            <Pressable key={a.value} onPress={() => setActivity(a.value)} style={[styles.option, active && styles.optionActive]}>
              <View style={[styles.radio, active && styles.radioActive]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.optionLabel}>{a.label}</Text>
                <Text style={styles.optionHint}>{a.hint}</Text>
              </View>
            </Pressable>
          );
        })}

        <Text style={[styles.label, { marginTop: 16 }]}>Цел</Text>
        <SegmentedControl<WeightGoal> value={goal} onChange={setGoal} options={WEIGHT_GOALS.map((g) => ({ label: g.label, value: g.value }))} />

        <Pressable style={styles.primaryBtn} onPress={next}>
          <Text style={styles.primaryBtnText}>Изчисли</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ProfileResult({ profile, onBack, onSaved }: { profile: UserProfile; onBack: () => void; onSaved: () => void }) {
  const { saveProfile } = useProfile();
  const [saving, setSaving] = useState(false);
  const metrics = computeMetrics(profile);
  const [healthyMin, healthyMax] = healthyWeightRange(profile.heightCm);

  // Where the "Цел" figure lands: the user's own target, otherwise the edge of
  // the healthy BMI range when they're outside it.
  const goalWeight =
    profile.targetWeightKg ?? (metrics.bmi > 24.9 ? healthyMax : metrics.bmi < 18.5 ? healthyMin : null);
  const goalBmi = goalWeight != null ? bmiOf(goalWeight, profile.heightCm) : null;
  const hasGoalFigure = goalBmi != null && Math.abs(goalBmi - metrics.bmi) >= 0.3;

  const [phase, setPhase] = useState<'now' | 'goal'>('now');
  useEffect(() => {
    if (!hasGoalFigure) return;
    // After the first morph (neutral → current), show the transformation once.
    const t = setTimeout(() => setPhase('goal'), 2600);
    return () => clearTimeout(t);
  }, [hasGoalFigure]);

  const shownBmi = phase === 'goal' && goalBmi != null ? goalBmi : metrics.bmi;
  const bmiText = useTween(shownBmi, 1400, NEUTRAL_BMI);
  const category = bmiCategory(shownBmi);

  const save = async () => {
    setSaving(true);
    try {
      await saveProfile(profile);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.resultCard}>
        {hasGoalFigure && (
          <SegmentedControl<'now' | 'goal'>
            value={phase}
            onChange={setPhase}
            options={[
              { label: `Сега · ${profile.weightKg} кг`, value: 'now' },
              { label: `Цел · ${Math.round(goalWeight!)} кг`, value: 'goal' },
            ]}
          />
        )}
        <BodyFigure bmi={shownBmi} sex={profile.sex} size={260} fromBmi={NEUTRAL_BMI} />
        <Text style={styles.bmiValue}>BMI {bmiText.toFixed(1)}</Text>
        <Text style={[styles.bmiCategory, { color: category.color }]}>{category.label}</Text>
        <Text style={styles.bmiHint}>
          Здравословно тегло за ръст {profile.heightCm} см: {Math.round(healthyMin)}–{Math.round(healthyMax)} кг
        </Text>
      </View>

      <View style={styles.statsRow}>
        <Stat label="BMR" value={metrics.bmr} unit="ккал" />
        <Stat label="TDEE" value={metrics.tdee} unit="ккал" />
        <Stat label="Дневна цел" value={metrics.goals.calories} unit="ккал" highlight />
      </View>
      <View style={styles.statsRow}>
        <Stat label="Протеин" value={metrics.goals.protein} unit="г" color={colors.protein} />
        <Stat label="Мазнини" value={metrics.goals.fat} unit="г" color={colors.fat} />
        <Stat label="Нетни В-ди" value={metrics.goals.netCarbs} unit="г" color={colors.carbs} />
      </View>
      <Text style={styles.hint}>
        BMR по формулата на Mifflin-St Jeor × коефициент на активност = TDEE. Макросите са кето разпределение 70% мазнини / 25%
        протеин / 5% въглехидрати. Можеш да ги промениш ръчно в Настройки.
      </Text>

      <View style={styles.actionsRow}>
        <Pressable style={styles.secondaryBtn} onPress={onBack}>
          <Text style={styles.secondaryBtnText}>Промени данните</Text>
        </Pressable>
        <Pressable style={[styles.primaryBtn, { flex: 1, marginTop: 0 }]} onPress={save} disabled={saving}>
          <Text style={styles.primaryBtnText}>{saving ? 'Запазване…' : 'Запази'}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function NumberField({ label, value, onChangeText, placeholder }: { label: string; value: string; onChangeText: (v: string) => void; placeholder: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType="numeric"
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
      />
    </View>
  );
}

function Stat({ label, value, unit, color, highlight }: { label: string; value: number; unit: string; color?: string; highlight?: boolean }) {
  const shown = useTween(value, 1200, 0);
  return (
    <View style={[styles.stat, highlight && styles.statHighlight]}>
      <Text style={[styles.statValue, color ? { color } : null, highlight && { color: colors.accent }]}>{Math.round(shown)}</Text>
      <Text style={styles.statUnit}>{unit}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 12,
    marginBottom: 8,
  },
  previewTitle: { color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: 6 },
  previewText: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  label: { color: colors.textMuted, fontSize: 12, marginTop: 12, marginBottom: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  field: { width: '48%' },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionActive: { borderColor: colors.accent },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.textMuted },
  radioActive: { borderColor: colors.accent, backgroundColor: colors.accent },
  optionLabel: { color: colors.text, fontSize: 14, fontWeight: '600' },
  optionHint: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  primaryBtn: { backgroundColor: colors.accent, paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  primaryBtnText: { color: colors.bg, fontWeight: '700', fontSize: 15 },
  secondaryBtn: {
    backgroundColor: colors.surfaceAlt,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  secondaryBtnText: { color: colors.text, fontWeight: '600', fontSize: 14 },
  resultCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 16, alignItems: 'center', marginBottom: 12 },
  bmiValue: { color: colors.text, fontSize: 30, fontWeight: '800', marginTop: 4 },
  bmiCategory: { fontSize: 15, fontWeight: '700', marginTop: 2 },
  bmiHint: { color: colors.textMuted, fontSize: 12, marginTop: 6, textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  statHighlight: { borderWidth: 1, borderColor: colors.accent },
  statValue: { color: colors.text, fontSize: 20, fontWeight: '700' },
  statUnit: { color: colors.textMuted, fontSize: 10 },
  statLabel: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  hint: { color: colors.textMuted, fontSize: 11, lineHeight: 16, marginTop: 4 },
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
});
