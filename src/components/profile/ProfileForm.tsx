import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { Button, Card, Input, Row, Segmented, Txt } from '@/components/ui';
import { BodyFigure } from '@/components/BodyFigure';
import { DietPicker } from '@/components/DietPicker';
import { useProfile } from '@/context/ProfileContext';
import { useSettings } from '@/context/SettingsContext';
import { useTween } from '@/hooks/useTween';
import { getDiet, type DietId } from '@/data/diets';
import { makeStyles, useTheme } from '@/theme/ThemeContext';
import { ACTIVITY_LEVELS, WEIGHT_GOALS, bmiCategory, bmiOf, computeMetrics, healthyWeightRange } from '@/utils/bodyMetrics';
import type { ActivityLevel, Sex, UserProfile, WeightGoal } from '@/types';

interface ProfileFormProps {
  initial: UserProfile | null;
  onSaved: () => void;
  /** onboarding: ask for the diet between the form and the result */
  askDiet?: boolean;
}

const NEUTRAL_BMI = 22;

export function ProfileForm({ initial, onSaved, askDiet }: ProfileFormProps) {
  const t = useTheme();
  const s = useStyles();
  const { dietId: currentDiet } = useSettings();
  const [step, setStep] = useState<'form' | 'diet' | 'result'>('form');
  const [sex, setSex] = useState<Sex>(initial?.sex ?? 'female');
  const [age, setAge] = useState(initial ? String(initial.age) : '');
  const [height, setHeight] = useState(initial ? String(initial.heightCm) : '');
  const [weight, setWeight] = useState(initial ? String(initial.weightKg) : '');
  const [target, setTarget] = useState(initial?.targetWeightKg ? String(initial.targetWeightKg) : '');
  const [activity, setActivity] = useState<ActivityLevel>(initial?.activity ?? 'light');
  const [goal, setGoal] = useState<WeightGoal>(initial?.goal ?? 'lose');
  const [dietId, setDietId] = useState<DietId>(currentDiet);

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
    setStep(askDiet ? 'diet' : 'result');
  };

  if (step === 'diet') {
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <Txt v="h2" style={{ marginBottom: 6 }}>
          Избери хранителен режим
        </Txt>
        <Txt v="small" tone="textMuted" style={{ marginBottom: 14 }}>
          Можеш да го смениш по всяко време от „Днес“ или „Настройки“.
        </Txt>
        <DietPicker
          value={dietId}
          selectLabel="Избери и продължи"
          onSelect={(id) => {
            setDietId(id);
            setStep('result');
          }}
        />
        <Button label={`Продължи с „${getDiet(dietId).name}“`} onPress={() => setStep('result')} style={{ marginTop: 8 }} />
        <Button label="Назад" variant="ghost" onPress={() => setStep('form')} />
      </ScrollView>
    );
  }

  if (step === 'result') {
    return <ProfileResult profile={draft} dietId={askDiet ? dietId : currentDiet} saveDiet={askDiet} onBack={() => setStep(askDiet ? 'diet' : 'form')} onSaved={onSaved} />;
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      <Card>
        <Row gap={12}>
          <BodyFigure bmi={liveBmi} sex={sex} size={150} />
          <View style={{ flex: 1 }}>
            <Txt v="h3" style={{ marginBottom: 6 }}>
              Твоят профил
            </Txt>
            <Txt v="small" tone="textMuted">
              По тези данни изчисляваме базовия метаболизъм, дневния разход на енергия и личните ти цели според избрания режим.
            </Txt>
          </View>
        </Row>
      </Card>

      <Txt v="label" tone="textMuted" style={s.label}>
        Пол
      </Txt>
      <Segmented<Sex>
        value={sex}
        onChange={setSex}
        options={[
          { label: 'Жена', value: 'female' },
          { label: 'Мъж', value: 'male' },
        ]}
      />

      <View style={s.grid}>
        <NumberField label="Възраст (години)" value={age} onChangeText={setAge} placeholder="35" />
        <NumberField label="Ръст (см)" value={height} onChangeText={setHeight} placeholder="170" />
        <NumberField label="Тегло (кг)" value={weight} onChangeText={setWeight} placeholder="75" />
        <NumberField label="Целево тегло (кг)" value={target} onChangeText={setTarget} placeholder="по избор" />
      </View>

      <Txt v="label" tone="textMuted" style={s.label}>
        Ниво на активност
      </Txt>
      {ACTIVITY_LEVELS.map((a) => {
        const active = a.value === activity;
        return (
          <Pressable key={a.value} onPress={() => setActivity(a.value)} style={[s.option, active && { borderColor: t.c.accent }]}>
            <View style={[s.radio, active && { borderColor: t.c.accent, backgroundColor: t.c.accent }]} />
            <View style={{ flex: 1 }}>
              <Txt v="bodyStrong">{a.label}</Txt>
              <Txt v="caption" tone="textMuted">
                {a.hint}
              </Txt>
            </View>
          </Pressable>
        );
      })}

      <Txt v="label" tone="textMuted" style={s.label}>
        Цел
      </Txt>
      <Segmented<WeightGoal> value={goal} onChange={setGoal} options={WEIGHT_GOALS.map((g) => ({ label: g.label, value: g.value }))} />

      <Button label={askDiet ? 'Напред' : 'Изчисли'} onPress={next} style={{ marginTop: 24 }} />
    </ScrollView>
  );
}

function ProfileResult({ profile, dietId, saveDiet, onBack, onSaved }: { profile: UserProfile; dietId: DietId; saveDiet?: boolean; onBack: () => void; onSaved: () => void }) {
  const t = useTheme();
  const s = useStyles();
  const { saveProfile } = useProfile();
  const [saving, setSaving] = useState(false);
  const diet = getDiet(dietId);
  const metrics = computeMetrics(profile, diet);
  const [healthyMin, healthyMax] = healthyWeightRange(profile.heightCm);

  // Where the "Цел" figure lands: the user's own target, otherwise the edge of the healthy BMI range.
  const goalWeight = profile.targetWeightKg ?? (metrics.bmi > 24.9 ? healthyMax : metrics.bmi < 18.5 ? healthyMin : null);
  const goalBmi = goalWeight != null ? bmiOf(goalWeight, profile.heightCm) : null;
  const hasGoalFigure = goalBmi != null && Math.abs(goalBmi - metrics.bmi) >= 0.3;

  const [phase, setPhase] = useState<'now' | 'goal'>('now');
  useEffect(() => {
    if (!hasGoalFigure) return;
    // After the first morph (neutral → current), show the transformation once.
    const timer = setTimeout(() => setPhase('goal'), 2600);
    return () => clearTimeout(timer);
  }, [hasGoalFigure]);

  const shownBmi = phase === 'goal' && goalBmi != null ? goalBmi : metrics.bmi;
  const bmiText = useTween(shownBmi, 1400, NEUTRAL_BMI);
  const category = bmiCategory(shownBmi);
  const toneColor = { info: t.c.info, success: t.c.success, warning: t.c.warning, danger: t.c.danger }[category.tone];

  const save = async () => {
    setSaving(true);
    try {
      await saveProfile(profile, saveDiet ? dietId : undefined);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
      <Card style={{ alignItems: 'center' }}>
        {hasGoalFigure && (
          <Segmented<'now' | 'goal'>
            value={phase}
            onChange={setPhase}
            style={{ alignSelf: 'stretch', marginBottom: 8 }}
            options={[
              { label: `Сега · ${profile.weightKg} кг`, value: 'now' },
              { label: `Цел · ${Math.round(goalWeight!)} кг`, value: 'goal' },
            ]}
          />
        )}
        <BodyFigure bmi={shownBmi} sex={profile.sex} size={250} fromBmi={NEUTRAL_BMI} />
        <Txt v="display">BMI {bmiText.toFixed(1)}</Txt>
        <Txt v="bodyStrong" color={toneColor}>
          {category.label}
        </Txt>
        <Txt v="small" tone="textMuted" center style={{ marginTop: 6 }}>
          Здравословно тегло за ръст {profile.heightCm} см: {Math.round(healthyMin)}–{Math.round(healthyMax)} кг
        </Txt>
      </Card>

      <Txt v="label" tone="textMuted" style={{ marginBottom: 8 }}>
        Режим: {diet.name}
      </Txt>
      <View style={s.statsRow}>
        <Stat label="Базов метаболизъм" value={metrics.bmr} unit="ккал" />
        <Stat label="Дневен разход" value={metrics.tdee} unit="ккал" />
        <Stat label="Дневна цел" value={metrics.goals.calories} unit="ккал" highlight />
      </View>
      {!diet.noCalories && (
        <View style={s.statsRow}>
          <Stat label="Протеин" value={metrics.goals.protein} unit="г" color={t.c.protein} />
          <Stat label="Мазнини" value={metrics.goals.fat} unit="г" color={t.c.fat} />
          <Stat label={diet.carbBasis === 'net' ? 'Нетни въгл.' : 'Въглехидрати'} value={metrics.goals.carbs} unit="г" color={t.c.carbs} />
        </View>
      )}
      <Txt v="caption" tone="textMuted" style={{ marginTop: 4 }}>
        Базов метаболизъм по формулата на Mifflin-St Jeor × коефициент на активност = дневен разход. Макросите следват разпределението на режима. Можеш да ги
        промениш ръчно в „Настройки“.
      </Txt>

      <Row gap={12} style={{ marginTop: 20 }}>
        <Button label="Назад" variant="secondary" onPress={onBack} flex />
        <Button label={saving ? 'Запазване…' : 'Запази'} onPress={save} disabled={saving} flex />
      </Row>
    </ScrollView>
  );
}

function NumberField({ label, value, onChangeText, placeholder }: { label: string; value: string; onChangeText: (v: string) => void; placeholder: string }) {
  const s = useStyles();
  return (
    <View style={s.field}>
      <Txt v="caption" tone="textMuted" style={{ marginBottom: 6, marginTop: 12 }}>
        {label}
      </Txt>
      <Input value={value} onChangeText={onChangeText} keyboardType="numeric" placeholder={placeholder} />
    </View>
  );
}

function Stat({ label, value, unit, color, highlight }: { label: string; value: number; unit: string; color?: string; highlight?: boolean }) {
  const t = useTheme();
  const s = useStyles();
  const shown = useTween(value, 1200, 0);
  return (
    <View style={[s.stat, highlight && { borderWidth: 2, borderColor: t.c.accent }]}>
      <Txt v="h2" color={highlight ? t.c.accent : color}>
        {Math.round(shown)}
      </Txt>
      <Txt v="caption" tone="textMuted">
        {unit}
      </Txt>
      <Txt v="caption" tone="textMuted" center style={{ marginTop: 2 }}>
        {label}
      </Txt>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  label: { marginTop: 18, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  field: { width: '48%' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: t.c.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: t.c.textFaint },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  stat: { flex: 1, backgroundColor: t.c.surface, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 4, alignItems: 'center' },
}));
