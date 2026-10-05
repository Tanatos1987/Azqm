import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import Constants from 'expo-constants';
import { Button, Card, IconButton, Input, Row, Screen, SectionHeader, Segmented, Txt } from '@/components/ui';
import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon, FileIcon, TrashIcon, UploadIcon, UserIcon } from '@/components/icons';
import { defaultModelFor, useSettings } from '@/context/SettingsContext';
import { useProfile } from '@/context/ProfileContext';
import { useDataRefresh } from '@/context/DataRefreshContext';
import { useToast } from '@/context/ToastContext';
import { getDiet } from '@/data/diets';
import { importDatabase, wipeDatabase } from '@/db/queries';
import { useTheme, type TextScaleKey, type ThemePref } from '@/theme/ThemeContext';
import { ACTIVITY_LEVELS, computeMetrics } from '@/utils/bodyMetrics';
import { exportBackup, exportCsv, exportExcel, pickBackup } from '@/utils/export';
import type { VisionProvider } from '@/types';

export default function SettingsScreen() {
  const t = useTheme();
  const db = useSQLiteContext();
  const settings = useSettings();
  const { update, goals, hasApiKey, setApiKey, clearApiKey, visionProvider, visionModel } = settings;
  const { profile, restoreProfile } = useProfile();
  const { bump } = useDataRefresh();
  const toast = useToast();
  const diet = getDiet(settings.dietId);
  const [busy, setBusy] = useState<string | null>(null);
  const [goalsDraft, setGoalsDraft] = useState(() => toDraft(goals));
  const [keyDraft, setKeyDraft] = useState('');
  const [modelDraft, setModelDraft] = useState(visionModel);

  // Re-sync the editable fields when the stored values change (diet switch, profile save, restore).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setGoalsDraft(toDraft(goals)), [goals]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setModelDraft(visionModel), [visionModel]);

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    try {
      await fn();
    } catch (err: any) {
      Alert.alert('Грешка', err?.message ?? String(err));
    } finally {
      setBusy(null);
    }
  };

  const saveGoals = async () => {
    const num = (v: string, fallback: number) => Math.max(Math.round(Number(v.replace(',', '.'))), 0) || fallback;
    await update({
      goals: {
        calories: num(goalsDraft.calories, goals.calories),
        protein: num(goalsDraft.protein, goals.protein),
        fat: num(goalsDraft.fat, goals.fat),
        carbs: num(goalsDraft.carbs, goals.carbs),
      },
    });
    toast.show('Дневните цели са запазени');
  };

  const resetGoals = async () => {
    if (!profile) return;
    await update({ goals: computeMetrics(profile, diet).goals });
    toast.show('Целите са изчислени наново по профила и режима');
  };

  const restore = () =>
    run('restore', async () => {
      const backup = await pickBackup();
      if (!backup) return;
      const count = backup.db.tables.food_entries?.length ?? 0;
      await new Promise<void>((resolve) =>
        Alert.alert('Възстановяване', `Копието съдържа ${count} записа на храни. Всички сегашни данни ще бъдат заменени. Продължаваш ли?`, [
          { text: 'Отказ', style: 'cancel', onPress: () => resolve() },
          {
            text: 'Възстанови',
            style: 'destructive',
            onPress: async () => {
              await importDatabase(db, backup.db);
              if (backup.settings) await update({ ...backup.settings });
              if (backup.profile) await restoreProfile(backup.profile);
              bump();
              toast.show('Данните са възстановени');
              resolve();
            },
          },
        ])
      );
    });

  const wipe = () =>
    Alert.alert('Изтриване на всички данни', 'Дневникът, теглото, водата, гладуванията и „Мои храни“ ще бъдат изтрити безвъзвратно. Направи първо резервно копие.', [
      { text: 'Отказ', style: 'cancel' },
      {
        text: 'Изтрий всичко',
        style: 'destructive',
        onPress: async () => {
          await wipeDatabase(db);
          bump();
          toast.show('Всички данни са изтрити');
        },
      },
    ]);

  const exportCtx = { profile, settings };

  return (
    <Screen
      title="Настройки"
      scroll
      left={
        <IconButton onPress={() => router.back()} accessibilityLabel="Назад">
          <ChevronLeftIcon size={24} color={t.c.text} />
        </IconButton>
      }
    >
      <SectionHeader title="Профил и режим" />
      <Card onPress={() => router.push('/profile')}>
        <Row gap={12}>
          <UserIcon size={24} color={t.c.accent} />
          <View style={{ flex: 1 }}>
            <Txt v="bodyStrong">
              {profile ? `${profile.sex === 'male' ? 'Мъж' : 'Жена'}, ${profile.age} г. · ${profile.heightCm} см · ${profile.weightKg} кг` : 'Няма профил'}
            </Txt>
            <Txt v="small" tone="textMuted">
              {profile ? ACTIVITY_LEVELS.find((a) => a.value === profile.activity)?.label : ''} · промени данните
            </Txt>
          </View>
          <ChevronRightIcon size={20} color={t.c.textMuted} />
        </Row>
      </Card>
      <Card onPress={() => router.push('/diet')}>
        <Row gap={12}>
          <Txt style={{ fontSize: 24 }}>🥗</Txt>
          <View style={{ flex: 1 }}>
            <Txt v="bodyStrong">{diet.name}</Txt>
            <Txt v="small" tone="textMuted" numberOfLines={2}>
              {diet.short}
            </Txt>
          </View>
          <ChevronRightIcon size={20} color={t.c.textMuted} />
        </Row>
      </Card>

      <SectionHeader title="Изглед" />
      <Card>
        <Txt v="label" tone="textMuted" style={{ marginBottom: 8 }}>
          Тема
        </Txt>
        <Segmented<ThemePref>
          value={settings.themePref}
          onChange={(v) => update({ themePref: v })}
          options={[
            { label: 'Като телефона', value: 'system' },
            { label: 'Тъмна', value: 'dark' },
            { label: 'Светла', value: 'light' },
          ]}
        />
        <Txt v="label" tone="textMuted" style={{ marginTop: 18, marginBottom: 8 }}>
          Размер на текста
        </Txt>
        <Segmented<TextScaleKey>
          value={settings.textScale}
          onChange={(v) => update({ textScale: v })}
          options={[
            { label: 'Нормален', value: 'normal' },
            { label: 'Голям', value: 'large' },
            { label: 'Много голям', value: 'xlarge' },
          ]}
        />
        <Txt v="body" style={{ marginTop: 14 }}>
          Примерен текст: Бяло сирене, 50 г — 132 ккал.
        </Txt>
      </Card>

      <SectionHeader title="Дневни цели" action={profile ? 'Изчисли наново' : undefined} onAction={resetGoals} />
      <Card>
        {diet.noCalories ? (
          <Txt tone="textMuted">При лечебно гладуване няма калорийна цел.</Txt>
        ) : (
          <>
            <Row gap={10} style={{ flexWrap: 'wrap' }}>
              <GoalField label="Калории (ккал)" value={goalsDraft.calories} onChange={(v) => setGoalsDraft((p) => ({ ...p, calories: v }))} />
              <GoalField label="Протеин (г)" value={goalsDraft.protein} onChange={(v) => setGoalsDraft((p) => ({ ...p, protein: v }))} />
              <GoalField label="Мазнини (г)" value={goalsDraft.fat} onChange={(v) => setGoalsDraft((p) => ({ ...p, fat: v }))} />
              <GoalField
                label={diet.carbBasis === 'net' ? 'Нетни въглехидрати (г)' : 'Въглехидрати (г)'}
                value={goalsDraft.carbs}
                onChange={(v) => setGoalsDraft((p) => ({ ...p, carbs: v }))}
              />
            </Row>
            <Button label="Запази целите" onPress={saveGoals} style={{ marginTop: 14 }} />
            <Txt v="caption" tone="textMuted" style={{ marginTop: 10 }}>
              Целите се изчисляват автоматично от профила и режима. Можеш да ги промениш ръчно; „Изчисли наново“ връща изчислените.
            </Txt>
          </>
        )}
      </Card>

      <SectionHeader title="Експорт и резервно копие" />
      <Card>
        <ExportRow
          icon={<FileIcon size={22} color={t.c.accent} />}
          title="Excel (.xlsx)"
          text="Дневник, суми по дни, тегло, вода, гладувания и профил — в отделни листове."
          busy={busy === 'xlsx'}
          onPress={() => run('xlsx', () => exportExcel(db, exportCtx))}
        />
        <ExportRow
          icon={<DownloadIcon size={22} color={t.c.accent} />}
          title="CSV"
          text="Дневникът като таблица — за Google Sheets и други програми."
          busy={busy === 'csv'}
          onPress={() => run('csv', () => exportCsv(db))}
        />
        <ExportRow
          icon={<UploadIcon size={22} color={t.c.accent} />}
          title="Резервно копие (.json)"
          text="Всички данни и настройки — за нов телефон или при преинсталиране."
          busy={busy === 'backup'}
          onPress={() => run('backup', () => exportBackup(db, exportCtx))}
        />
        <ExportRow
          icon={<DownloadIcon size={22} color={t.c.info} />}
          title="Възстанови от копие"
          text="Избери файл azqm-backup-….json. Сегашните данни ще бъдат заменени."
          busy={busy === 'restore'}
          onPress={restore}
          last
        />
      </Card>

      <SectionHeader title="Разпознаване по снимка (по избор)" />
      <Card>
        <Txt v="small" tone="textMuted" style={{ marginBottom: 10 }}>
          Снимката се изпраща към Google Gemini или OpenAI с твой API ключ. Без ключ приложението работи напълно с базата храни.
        </Txt>
        <Segmented<VisionProvider>
          value={visionProvider}
          onChange={(p) => update({ visionProvider: p, visionModel: defaultModelFor(p) })}
          options={[
            { label: 'Gemini', value: 'gemini' },
            { label: 'OpenAI', value: 'openai' },
          ]}
        />
        <Txt v="label" tone="textMuted" style={{ marginTop: 14, marginBottom: 8 }}>
          Модел
        </Txt>
        <Row gap={8}>
          <Input value={modelDraft} onChangeText={setModelDraft} autoCapitalize="none" placeholder={defaultModelFor(visionProvider)} style={{ flex: 1 }} />
          <Button label="OK" small onPress={() => update({ visionModel: modelDraft.trim() || defaultModelFor(visionProvider) })} />
        </Row>
        <Txt v="label" tone="textMuted" style={{ marginTop: 14, marginBottom: 8 }}>
          API ключ {hasApiKey ? '(зададен ✓)' : '(няма)'}
        </Txt>
        <Row gap={8}>
          <Input value={keyDraft} onChangeText={setKeyDraft} autoCapitalize="none" secureTextEntry placeholder="AIza… или sk-…" style={{ flex: 1 }} />
          <Button
            label="OK"
            small
            onPress={async () => {
              if (!keyDraft.trim()) return;
              await setApiKey(keyDraft.trim());
              setKeyDraft('');
              toast.show('Ключът е записан сигурно на устройството');
            }}
          />
        </Row>
        {hasApiKey && (
          <Pressable onPress={clearApiKey} style={{ marginTop: 10 }} hitSlop={8}>
            <Txt v="smallStrong" tone="danger">
              Изтрий ключа
            </Txt>
          </Pressable>
        )}
      </Card>

      <SectionHeader title="Данни" />
      <Button label="Изтрий всички данни" variant="danger" icon={<TrashIcon size={20} color={t.c.danger} />} onPress={wipe} />

      <Txt v="caption" tone="textFaint" center style={{ marginTop: 20 }}>
        Azqm {Constants.expoConfig?.version ?? ''} · Данни за храните: USDA FoodData Central (SR Legacy, публичен домейн); ястията са изчислени по типични рецепти.
        Приложението не замества консултация с лекар или диетолог.
      </Txt>
    </Screen>
  );
}

function toDraft(g: { calories: number; protein: number; fat: number; carbs: number }) {
  return { calories: String(g.calories), protein: String(g.protein), fat: String(g.fat), carbs: String(g.carbs) };
}

function GoalField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ width: '47%', flexGrow: 1 }}>
      <Txt v="caption" tone="textMuted" style={{ marginBottom: 6 }}>
        {label}
      </Txt>
      <Input value={value} onChangeText={onChange} keyboardType="numeric" />
    </View>
  );
}

function ExportRow({ icon, title, text, onPress, busy, last }: { icon: React.ReactNode; title: string; text: string; onPress: () => void; busy: boolean; last?: boolean }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} disabled={busy} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderBottomWidth: last ? 0 : 1, borderBottomColor: t.c.border }, pressed && { opacity: 0.7 }]}>
      {icon}
      <View style={{ flex: 1 }}>
        <Txt v="bodyStrong">{title}</Txt>
        <Txt v="caption" tone="textMuted">
          {text}
        </Txt>
      </View>
      {busy ? <ActivityIndicator color={t.c.accent} /> : <ChevronRightIcon size={20} color={t.c.textMuted} />}
    </Pressable>
  );
}
