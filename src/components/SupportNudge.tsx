/**
 * Asks for support while the user has no Pro (the "Подкрепи" tab is the always-visible way in, see the tab layout):
 * a banner at the top of the Today screen — tapping it opens the support wizard, its × hides it for a few days —
 * and, now and then on start, the wizard by itself: first on the third day, then at most every fourth day, plus
 * once at each diary milestone (7 / 30 / 100 / 365 days with entries). Never on the start that shows the tour.
 * Everything disappears once Pro is unlocked.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useIsFocused } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Card, Row, Txt } from '@/components/ui';
import { CloseIcon, HeartIcon } from '@/components/icons';
import { SupportWizard } from '@/components/SupportWizard';
import { usePro } from '@/context/ProContext';
import { useTour } from '@/context/TourContext';
import { getLoggedDayCount } from '@/db/queries';
import { makeStyles, useTheme } from '@/theme/ThemeContext';
import { shiftDateKey, todayKey } from '@/utils/date';
import { useI18n } from '@/i18n';

const NUDGE_KEY = 'azqm.nudge';
const BANNER_SNOOZE_DAYS = 3;
/** Days after the first start (or after the update that added this) before the first prompt. */
const PROMPT_AFTER_DAYS = 2;
const PROMPT_EVERY_DAYS = 4;
const MILESTONES = [7, 30, 100, 365];
/** Let the Today screen settle before the wizard slides up. */
const PROMPT_DELAY_MS = 1500;

interface NudgeState {
  /** First day the app ran with these nudges. */
  since: string;
  bannerHiddenUntil?: string;
  /** Day the wizard last opened by itself. */
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
  const tour = useTour();
  const focused = useIsFocused();
  const [state, setState] = useState<NudgeState | null>(null);
  /** null: closed; 0: the wizard; > 0: the wizard opened at a milestone, with the number of diary days. */
  const [wizard, setWizard] = useState<number | null>(null);
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

  // Once per app start, while the Today screen is on top and the tour isn't (or wasn't) showing.
  useEffect(() => {
    if (!state || !loaded || isPro || !focused || checked.current || tour.seenAtStart !== true || tour.active) return;
    const timer = setTimeout(async () => {
      checked.current = true;
      const today = todayKey();
      if (state.promptOn === today) return;
      const days = await getLoggedDayCount(db).catch(() => 0);
      const reached = MILESTONES.filter((m) => days >= m).pop() ?? 0;
      if (reached > (state.milestone ?? 0)) {
        setWizard(days);
        save({ ...state, promptOn: today, milestone: reached });
      } else if (shiftDateKey(state.since, PROMPT_AFTER_DAYS) <= today && (!state.promptOn || shiftDateKey(state.promptOn, PROMPT_EVERY_DAYS) <= today)) {
        setWizard(0);
        save({ ...state, promptOn: today });
      }
    }, PROMPT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state, loaded, isPro, focused, tour.seenAtStart, tour.active, db, save]);

  if (!loaded || isPro || !state) return null;

  const bannerHidden = state.bannerHiddenUntil != null && todayKey() < state.bannerHiddenUntil;

  return (
    <>
      {!bannerHidden && (
        <Card onPress={() => setWizard(0)} tight style={s.banner}>
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
      {wizard !== null && <SupportWizard milestoneDays={wizard || undefined} onClose={() => setWizard(null)} />}
    </>
  );
}

const useStyles = makeStyles((t) => ({
  banner: { backgroundColor: t.c.accentSoft, borderColor: t.c.accent },
  bubble: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: t.c.surface },
}));
