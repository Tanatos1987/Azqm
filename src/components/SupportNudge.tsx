/**
 * Asks for support while the user has no Pro (the "Подкрепи" tab is the always-visible way in, see the tab layout):
 * a banner at the top of the Today screen — its × hides it for a few days — and, now and then on start, a sheet:
 * first on the third day, then at most every fourth day, plus once at each diary milestone (7 / 30 / 100 / 365 days
 * with entries). Everything disappears once Pro is unlocked.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useIsFocused } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button, Card, Row, Sheet, Txt } from '@/components/ui';
import { CloseIcon, HeartIcon } from '@/components/icons';
import { usePro } from '@/context/ProContext';
import { getLoggedDayCount } from '@/db/queries';
import { makeStyles, useTheme } from '@/theme/ThemeContext';
import { shiftDateKey, todayKey } from '@/utils/date';
import { useI18n } from '@/i18n';

const NUDGE_KEY = 'azqm.nudge';
const BANNER_SNOOZE_DAYS = 3;
/** Days after the first start (or after the update that added this) before the first sheet. */
const PROMPT_AFTER_DAYS = 2;
const PROMPT_EVERY_DAYS = 4;
const MILESTONES = [7, 30, 100, 365];
/** Let the Today screen settle before the sheet slides up. */
const PROMPT_DELAY_MS = 1500;

interface NudgeState {
  /** First day the app ran with these nudges. */
  since: string;
  bannerHiddenUntil?: string;
  /** Day the sheet was last shown. */
  promptOn?: string;
  /** Highest milestone already shown. */
  milestone?: number;
}

/** For the Today screen. */
export function SupportBanner() {
  const t = useTheme();
  const s = useStyles();
  const db = useSQLiteContext();
  const { tr } = useI18n();
  const { isPro, loaded } = usePro();
  const focused = useIsFocused();
  const [state, setState] = useState<NudgeState | null>(null);
  /** null: closed; 0: the plain sheet; > 0: the milestone sheet with the number of diary days. */
  const [prompt, setPrompt] = useState<number | null>(null);
  const checked = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(NUDGE_KEY)
      .then((v) => (v ? (JSON.parse(v) as NudgeState) : null))
      .catch(() => null)
      .then((stored) => {
        if (stored?.since) return setState(stored);
        const fresh = { since: todayKey() };
        setState(fresh);
        AsyncStorage.setItem(NUDGE_KEY, JSON.stringify(fresh)).catch(() => {});
      });
  }, []);

  const save = useCallback((next: NudgeState) => {
    setState(next);
    AsyncStorage.setItem(NUDGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  // Once per app start, while the Today screen is on top.
  useEffect(() => {
    if (!state || !loaded || isPro || !focused || checked.current) return;
    const timer = setTimeout(async () => {
      checked.current = true;
      const today = todayKey();
      if (state.promptOn === today) return;
      const days = await getLoggedDayCount(db).catch(() => 0);
      const reached = MILESTONES.filter((m) => days >= m).pop() ?? 0;
      if (reached > (state.milestone ?? 0)) {
        setPrompt(days);
        save({ ...state, promptOn: today, milestone: reached });
      } else if (shiftDateKey(state.since, PROMPT_AFTER_DAYS) <= today && (!state.promptOn || shiftDateKey(state.promptOn, PROMPT_EVERY_DAYS) <= today)) {
        setPrompt(0);
        save({ ...state, promptOn: today });
      }
    }, PROMPT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state, loaded, isPro, focused, db, save]);

  if (!loaded || isPro || !state) return null;

  const openSupport = () => {
    setPrompt(null);
    router.push('/support');
  };
  const bannerHidden = state.bannerHiddenUntil != null && todayKey() < state.bannerHiddenUntil;

  return (
    <>
      {!bannerHidden && (
        <Card onPress={openSupport} tight style={s.banner}>
          <Row gap={12}>
            <View style={s.bubble}>
              <HeartIcon size={22} color={t.c.accent} filled />
            </View>
            <View style={{ flex: 1 }}>
              <Txt v="bodyStrong">{tr('Подкрепи Azqm', 'Support Azqm')}</Txt>
              <Txt v="small" tone="textMuted">
                {tr('Еднократна сума по избор отключва Pro: снимки за прогрес и още.', 'A one-time amount of your choice unlocks Pro: progress photos and more.')}
              </Txt>
            </View>
            <Pressable
              onPress={() => save({ ...state, bannerHiddenUntil: shiftDateKey(todayKey(), BANNER_SNOOZE_DAYS) })}
              hitSlop={12}
              accessibilityLabel={tr('Скрий за няколко дни', 'Hide for a few days')}
            >
              <CloseIcon size={18} color={t.c.textMuted} />
            </Pressable>
          </Row>
        </Card>
      )}

      <Sheet visible={prompt !== null} onClose={() => setPrompt(null)}>
        <View style={{ alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Txt style={{ fontSize: 44 }}>{prompt ? '🎉' : '💚'}</Txt>
          <Txt v="h2" center>
            {prompt ? tr('{n} {n|ден|дни} с Azqm!', '{n} {n|day|days} with Azqm!', { n: prompt }) : tr('Azqm е безплатно и без реклами', 'Azqm is free and ad-free')}
          </Txt>
          <Txt tone="textMuted" center>
            {prompt
              ? tr(
                  'Толкова дни вече водиш дневник — браво! Ако Azqm ти помага, подкрепи го с еднократна сума по избор. Тя отключва Pro завинаги.',
                  'That’s how many days you’ve kept your food diary — well done! If Azqm helps you, support it with a one-time amount of your choice. It unlocks Pro for good.'
                )
              : tr(
                  'Без регистрация, а данните ти остават на телефона. Ако приложението ти помага, подкрепи го с еднократна сума по избор. Тя отключва Pro завинаги.',
                  'No sign-up, and your data stays on your phone. If the app helps you, support it with a one-time amount of your choice. It unlocks Pro for good.'
                )}
          </Txt>
        </View>
        <View style={s.perks}>
          <Txt>📸 {tr('Снимки за прогрес', 'Progress photos')}</Txt>
          <Txt>↔️ {tr('Сравнение преди и след', 'Before and after')}</Txt>
          <Txt>✨ {tr('Бъдещите Pro функции', 'Future Pro features')}</Txt>
        </View>
        <Button label={tr('Подкрепи Azqm', 'Support Azqm')} icon={<HeartIcon size={20} color={t.c.onAccent} filled />} onPress={openSupport} />
        <Button label={tr('Не сега', 'Not now')} variant="ghost" onPress={() => setPrompt(null)} style={{ marginTop: 6 }} />
      </Sheet>
    </>
  );
}

const useStyles = makeStyles((t) => ({
  banner: { backgroundColor: t.c.accentSoft, borderColor: t.c.accent },
  bubble: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: t.c.surface },
  perks: { backgroundColor: t.c.surfaceAlt, borderRadius: 16, padding: 14, gap: 8, marginBottom: 16 },
}));
