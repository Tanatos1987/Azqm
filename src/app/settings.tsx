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
import { useI18n, type Lang } from '@/i18n';
import { useTheme, type TextScaleKey, type ThemePref } from '@/theme/ThemeContext';
import { ACTIVITY_LEVELS, computeMetrics } from '@/utils/bodyMetrics';
import { exportBackup, exportCsv, exportExcel, pickBackup } from '@/utils/export';
import type { VisionProvider } from '@/types';

export default function SettingsScreen() {
  const t = useTheme();
  const { tr } = useI18n();
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
      Alert.alert(tr('Грешка', 'Error'), err?.message ?? String(err));
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
    toast.show(tr('Дневните цели са запазени', 'Daily goals saved'));
  };

  const resetGoals = async () => {
    if (!profile) return;
    await update({ goals: computeMetrics(profile, diet).goals });
    toast.show(tr('Целите са изчислени наново по профила и режима', 'Goals recalculated from your profile and diet'));
  };

  const restore = () =>
    run('restore', async () => {
      const backup = await pickBackup();
      if (!backup) return;
      const count = backup.db.tables.food_entries?.length ?? 0;
      await new Promise<void>((resolve) =>
        Alert.alert(
          tr('Възстановяване', 'Restore'),
          tr(
            `Копието съдържа ${count} записа на храни. Всички сегашни данни ще бъдат заменени. Продължаваш ли?`,
            `The backup contains ${count} food ${count === 1 ? 'entry' : 'entries'}. All current data will be replaced. Continue?`
          ),
          [
            { text: tr('Отказ', 'Cancel'), style: 'cancel', onPress: () => resolve() },
            {
              text: tr('Възстанови', 'Restore'),
              style: 'destructive',
              onPress: async () => {
                await importDatabase(db, backup.db);
                if (backup.settings) await update({ ...backup.settings });
                if (backup.profile) await restoreProfile(backup.profile);
                bump();
                toast.show(tr('Данните са възстановени', 'Data restored'));
                resolve();
              },
            },
          ]
        )
      );
    });

  const wipe = () =>
    Alert.alert(
      tr('Изтриване на всички данни', 'Delete all data'),
      tr(
        'Дневникът, теглото, водата, гладуванията и „Мои храни“ ще бъдат изтрити безвъзвратно. Направи първо резервно копие.',
        'Your diary, weight, water, fasts and “My foods” will be deleted permanently. Make a backup first.'
      ),
      [
        { text: tr('Отказ', 'Cancel'), style: 'cancel' },
        {
          text: tr('Изтрий всичко', 'Delete everything'),
          style: 'destructive',
          onPress: async () => {
            await wipeDatabase(db);
            bump();
            toast.show(tr('Всички данни са изтрити', 'All data deleted'));
          },
        },
      ]
    );

  const exportCtx = { profile, settings };

  return (
    <Screen
      title={tr('Настройки', 'Settings')}
      scroll
      left={
        <IconButton onPress={() => router.back()} accessibilityLabel={tr('Назад', 'Back')}>
          <ChevronLeftIcon size={24} color={t.c.text} />
        </IconButton>
      }
    >
      <SectionHeader title={tr('Профил и режим', 'Profile and diet')} />
      <Card onPress={() => router.push('/profile')}>
        <Row gap={12}>
          <UserIcon size={24} color={t.c.accent} />
          <View style={{ flex: 1 }}>
            <Txt v="bodyStrong">
              {profile
                ? tr(
                    `${profile.sex === 'male' ? 'Мъж' : 'Жена'}, ${profile.age} г. · ${profile.heightCm} см · ${profile.weightKg} кг`,
                    `${profile.sex === 'male' ? 'Male' : 'Female'}, ${profile.age} y · ${profile.heightCm} cm · ${profile.weightKg} kg`
                  )
                : tr('Няма профил', 'No profile')}
            </Txt>
            <Txt v="small" tone="textMuted">
              {profile ? ACTIVITY_LEVELS.find((a) => a.value === profile.activity)?.label : ''} · {tr('промени данните', 'edit details')}
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

      <SectionHeader title={tr('Изглед', 'Appearance')} />
      <Card>
        <Txt v="label" tone="textMuted" style={{ marginBottom: 8 }}>
          {tr('Език', 'Language')}
        </Txt>
        {/* Option labels stay in their own language in both modes. */}
        <Segmented<Lang>
          value={settings.language}
          onChange={(v) => update({ language: v })}
          options={[
            { label: 'Български', value: 'bg' },
            { label: 'English', value: 'en' },
          ]}
        />
      </Card>
      <Card>
        <Txt v="label" tone="textMuted" style={{ marginBottom: 8 }}>
          {tr('Тема', 'Theme')}
        </Txt>
        <Segmented<ThemePref>
          value={settings.themePref}
          onChange={(v) => update({ themePref: v })}
          options={[
            { label: tr('Като телефона', 'System'), value: 'system' },
            { label: tr('Тъмна', 'Dark'), value: 'dark' },
            { label: tr('Светла', 'Light'), value: 'light' },
          ]}
        />
        <Txt v="label" tone="textMuted" style={{ marginTop: 18, marginBottom: 8 }}>
          {tr('Размер на текста', 'Text size')}
        </Txt>
        <Segmented<TextScaleKey>
          value={settings.textScale}
          onChange={(v) => update({ textScale: v })}
          options={[
            { label: tr('Нормален', 'Normal'), value: 'normal' },
            { label: tr('Голям', 'Large'), value: 'large' },
            { label: tr('Много голям', 'Extra large'), value: 'xlarge' },
          ]}
        />
        <Txt v="body" style={{ marginTop: 14 }}>
          {tr('Примерен текст: Бяло сирене, 50 г — 132 ккал.', 'Sample text: Feta cheese, 50 g — 132 kcal.')}
        </Txt>
      </Card>

      <SectionHeader title={tr('Дневни цели', 'Daily goals')} action={profile ? tr('Изчисли наново', 'Recalculate') : undefined} onAction={resetGoals} />
      <Card>
        {diet.noCalories ? (
          <Txt tone="textMuted">{tr('При лечебно гладуване няма калорийна цел.', 'Therapeutic fasting has no calorie goal.')}</Txt>
        ) : (
          <>
            <Row gap={10} style={{ flexWrap: 'wrap' }}>
              <GoalField label={tr('Калории (ккал)', 'Calories (kcal)')} value={goalsDraft.calories} onChange={(v) => setGoalsDraft((p) => ({ ...p, calories: v }))} />
              <GoalField label={tr('Протеин (г)', 'Protein (g)')} value={goalsDraft.protein} onChange={(v) => setGoalsDraft((p) => ({ ...p, protein: v }))} />
              <GoalField label={tr('Мазнини (г)', 'Fat (g)')} value={goalsDraft.fat} onChange={(v) => setGoalsDraft((p) => ({ ...p, fat: v }))} />
              <GoalField
                label={diet.carbBasis === 'net' ? tr('Нетни въглехидрати (г)', 'Net carbs (g)') : tr('Въглехидрати (г)', 'Carbs (g)')}
                value={goalsDraft.carbs}
                onChange={(v) => setGoalsDraft((p) => ({ ...p, carbs: v }))}
              />
            </Row>
            <Button label={tr('Запази целите', 'Save goals')} onPress={saveGoals} style={{ marginTop: 14 }} />
            <Txt v="caption" tone="textMuted" style={{ marginTop: 10 }}>
              {tr(
                'Целите се изчисляват автоматично от профила и режима. Можеш да ги промениш ръчно; „Изчисли наново“ връща изчислените.',
                'Goals are calculated automatically from your profile and diet. You can change them manually; “Recalculate” brings back the calculated ones.'
              )}
            </Txt>
          </>
        )}
      </Card>

      <SectionHeader title={tr('Експорт и резервно копие', 'Export and backup')} />
      <Card>
        <ExportRow
          icon={<FileIcon size={22} color={t.c.accent} />}
          title="Excel (.xlsx)"
          text={tr('Дневник, суми по дни, тегло, вода, гладувания и профил — в отделни листове.', 'Diary, daily totals, weight, water, fasts and profile — on separate sheets.')}
          busy={busy === 'xlsx'}
          onPress={() => run('xlsx', () => exportExcel(db, exportCtx))}
        />
        <ExportRow
          icon={<DownloadIcon size={22} color={t.c.accent} />}
          title="CSV"
          text={tr('Дневникът като таблица — за Google Sheets и други програми.', 'Your diary as a table — for Google Sheets and other apps.')}
          busy={busy === 'csv'}
          onPress={() => run('csv', () => exportCsv(db))}
        />
        <ExportRow
          icon={<UploadIcon size={22} color={t.c.accent} />}
          title={tr('Резервно копие (.json)', 'Backup (.json)')}
          text={tr('Всички данни и настройки — за нов телефон или при преинсталиране.', 'All data and settings — for a new phone or a reinstall.')}
          busy={busy === 'backup'}
          onPress={() => run('backup', () => exportBackup(db, exportCtx))}
        />
        <ExportRow
          icon={<DownloadIcon size={22} color={t.c.info} />}
          title={tr('Възстанови от копие', 'Restore from backup')}
          text={tr('Избери файл azqm-backup-….json. Сегашните данни ще бъдат заменени.', 'Pick an azqm-backup-….json file. Your current data will be replaced.')}
          busy={busy === 'restore'}
          onPress={restore}
          last
        />
      </Card>

      <SectionHeader title={tr('Разпознаване по снимка (по избор)', 'Photo recognition (optional)')} />
      <Card>
        <Txt v="small" tone="textMuted" style={{ marginBottom: 10 }}>
          {tr(
            'Снимката се изпраща към Google Gemini или OpenAI с твой API ключ. Без ключ приложението работи напълно с базата храни.',
            'The photo is sent to Google Gemini or OpenAI using your own API key. Without a key, the app works fully with the food database.'
          )}
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
          {tr('Модел', 'Model')}
        </Txt>
        <Row gap={8}>
          <Input value={modelDraft} onChangeText={setModelDraft} autoCapitalize="none" placeholder={defaultModelFor(visionProvider)} style={{ flex: 1 }} />
          <Button label="OK" small onPress={() => update({ visionModel: modelDraft.trim() || defaultModelFor(visionProvider) })} />
        </Row>
        <Txt v="label" tone="textMuted" style={{ marginTop: 14, marginBottom: 8 }}>
          {tr('API ключ', 'API key')} {hasApiKey ? tr('(зададен ✓)', '(set ✓)') : tr('(няма)', '(none)')}
        </Txt>
        <Row gap={8}>
          <Input value={keyDraft} onChangeText={setKeyDraft} autoCapitalize="none" secureTextEntry placeholder={tr('AIza… или sk-…', 'AIza… or sk-…')} style={{ flex: 1 }} />
          <Button
            label="OK"
            small
            onPress={async () => {
              if (!keyDraft.trim()) return;
              await setApiKey(keyDraft.trim());
              setKeyDraft('');
              toast.show(tr('Ключът е записан сигурно на устройството', 'Key saved securely on this device'));
            }}
          />
        </Row>
        {hasApiKey && (
          <Pressable onPress={clearApiKey} style={{ marginTop: 10 }} hitSlop={8}>
            <Txt v="smallStrong" tone="danger">
              {tr('Изтрий ключа', 'Delete key')}
            </Txt>
          </Pressable>
        )}
      </Card>

      <SectionHeader title={tr('Данни', 'Data')} />
      <Button label={tr('Изтрий всички данни', 'Delete all data')} variant="danger" icon={<TrashIcon size={20} color={t.c.danger} />} onPress={wipe} />

      <Txt v="caption" tone="textFaint" center style={{ marginTop: 20 }}>
        Azqm {Constants.expoConfig?.version ?? ''} ·{' '}
        {tr(
          'Данни за храните: USDA FoodData Central (SR Legacy, публичен домейн); ястията са изчислени по типични рецепти. Приложението не замества консултация с лекар или диетолог.',
          'Food data: USDA FoodData Central (SR Legacy, public domain); dishes are calculated from typical recipes. The app is not a substitute for advice from a doctor or dietitian.'
        )}
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
