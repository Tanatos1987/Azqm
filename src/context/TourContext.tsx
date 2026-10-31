/**
 * First-run tour: the screen dims, a window opens over one button at a time and a card says what it does, with
 * Skip / Back / Next. Buttons take part by wrapping themselves in <TourTarget id="…">; the Today screen lends its
 * scroll view (useTourScroller) so targets below the fold are scrolled into view first. The texts are in
 * src/data/help.ts. Shown once — to new users after onboarding and to existing users after the update that added
 * it — and replayed from Help.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button, Row, Txt } from '@/components/ui';
import { usePro } from '@/context/ProContext';
import { tourSteps, type TourStep, type TourTargetId } from '@/data/help';
import { makeStyles } from '@/theme/ThemeContext';
import { useI18n } from '@/i18n';

const TOUR_KEY = 'azqm.tour';
/** Time for a programmatic scroll to settle before the target is measured again. */
const SCROLL_SETTLE_MS = 400;
const MEASURE_TIMEOUT_MS = 500;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TourScroller {
  scrollBy: (dy: number) => void;
  scrollToTop: () => void;
}

interface TourValue {
  /** Whether the tour was finished or skipped; null until read from storage. */
  seen: boolean | null;
  /** `seen` as it was when the app started — start-up prompts stay away on the start that shows the tour. */
  seenAtStart: boolean | null;
  active: boolean;
  start: () => void;
  register: (id: TourTargetId, node: View | null) => void;
  setScroller: (scroller: TourScroller | null) => void;
}

const TourContext = createContext<TourValue | null>(null);

/** null when the view has no size — or never answers (a view that is going away doesn't call back). */
const measure = (node: View) =>
  new Promise<Rect | null>((resolve) => {
    const timer = setTimeout(() => resolve(null), MEASURE_TIMEOUT_MS);
    node.measureInWindow((x, y, w, h) => {
      clearTimeout(timer);
      resolve(w > 0 && h > 0 ? { x, y, w, h } : null);
    });
  });
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function TourProvider({ children }: { children: React.ReactNode }) {
  const { isPro } = usePro();
  const [seen, setSeen] = useState<boolean | null>(null);
  const [seenAtStart, setSeenAtStart] = useState<boolean | null>(null);
  const [steps, setSteps] = useState<TourStep[] | null>(null);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const targets = useRef(new Map<TourTargetId, View>());
  const scroller = useRef<TourScroller | null>(null);
  /** Bumped on every step change, so a slow measurement of an older step is dropped. */
  const turn = useRef(0);

  useEffect(() => {
    AsyncStorage.getItem(TOUR_KEY)
      .then((v) => v === '1')
      .catch(() => false)
      .then((done) => {
        setSeen(done);
        setSeenAtStart(done);
      });
  }, []);

  const register = useCallback((id: TourTargetId, node: View | null) => {
    if (node) targets.current.set(id, node);
    else targets.current.delete(id);
  }, []);

  const setScroller = useCallback((s: TourScroller | null) => {
    scroller.current = s;
  }, []);

  const finish = useCallback(() => {
    turn.current++;
    setSteps(null);
    setRect(null);
    setSeen(true);
    AsyncStorage.setItem(TOUR_KEY, '1').catch(() => {});
  }, []);

  /** Where scrolled content is visible: below the Today header, above the tab bar. */
  const visibleBand = useCallback(async () => {
    const header = targets.current.get('today-date');
    const tabBar = targets.current.get('tab-add');
    const h = header ? await measure(header) : null;
    const t = tabBar ? await measure(tabBar) : null;
    return { top: h ? h.y + h.h + 14 : 110, bottom: t ? t.y - 12 : Number.POSITIVE_INFINITY };
  }, []);

  /** Shows step i, or the nearest one in direction `dir` whose button is on screen; past the end, finishes. */
  const show = useCallback(
    async (list: TourStep[], i: number, dir: 1 | -1) => {
      const myTurn = ++turn.current;
      for (let j = i; j >= 0 && j < list.length; j += dir) {
        const step = list[j];
        if (!step.target) {
          setRect(null);
          setIndex(j);
          return;
        }
        const node = targets.current.get(step.target);
        let r = node ? await measure(node) : null;
        if (node && r && step.scroll && scroller.current) {
          const band = await visibleBand();
          const dy = r.y + r.h > band.bottom ? r.y + r.h - band.bottom + 16 : r.y < band.top ? r.y - band.top - 16 : 0;
          if (dy !== 0) {
            // Hide the window while the page moves under it.
            setRect(null);
            scroller.current.scrollBy(dy);
            await wait(SCROLL_SETTLE_MS);
            r = await measure(node);
          }
        }
        if (myTurn !== turn.current) return;
        if (r) {
          setRect(r);
          setIndex(j);
          return;
        }
      }
      if (myTurn === turn.current && dir === 1) finish();
    },
    [finish, visibleBand]
  );

  const start = useCallback(() => {
    const list = tourSteps(isPro);
    scroller.current?.scrollToTop();
    setSteps(list);
    show(list, 0, 1);
  }, [isPro, show]);

  const value = useMemo<TourValue>(
    () => ({ seen, seenAtStart, active: steps !== null, start, register, setScroller }),
    [seen, seenAtStart, steps, start, register, setScroller]
  );

  return (
    <TourContext.Provider value={value}>
      {children}
      {steps && (
        <TourOverlay
          step={steps[index]}
          number={index + 1}
          total={steps.length}
          rect={rect}
          onNext={() => show(steps, index + 1, 1)}
          onBack={() => show(steps, index - 1, -1)}
          onSkip={finish}
        />
      )}
    </TourContext.Provider>
  );
}

export function useTour(): TourValue {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used inside <TourProvider>');
  return ctx;
}

/** Marks a button the tour can point at. */
export function TourTarget({ id, children, style }: { id: TourTargetId; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { register } = useTour();
  const ref = useCallback((node: View | null) => register(id, node), [register, id]);
  return (
    // collapsable={false}: Android would otherwise flatten the wrapper away and there'd be nothing to measure.
    <View ref={ref} collapsable={false} style={style}>
      {children}
    </View>
  );
}

/** The Today screen lends its scroll view to the tour while it is mounted. */
export function useTourScroller(scroller: TourScroller) {
  const { setScroller } = useTour();
  useEffect(() => {
    setScroller(scroller);
    return () => setScroller(null);
  }, [scroller, setScroller]);
}

function TourOverlay({ step, number, total, rect, onNext, onBack, onSkip }: { step: TourStep; number: number; total: number; rect: Rect | null; onNext: () => void; onBack: () => void; onSkip: () => void }) {
  const s = useStyles();
  const { tr } = useI18n();
  // The overlay's own place in the window: measureInWindow coordinates are turned into overlay coordinates with it,
  // whether or not the app draws under the status bar.
  const root = useRef<View>(null);
  const [frame, setFrame] = useState<Rect | null>(null);
  const onLayout = () => root.current?.measureInWindow((x, y, w, h) => setFrame({ x, y, w, h }));

  const welcome = !step.target;
  const last = number === total;
  // Tab bar icons are small: open the window over the whole tab (icon and label).
  const raw =
    rect && frame
      ? step.target?.startsWith('tab-')
        ? { x: rect.x + rect.w / 2 - 34 - frame.x, y: rect.y - 8 - frame.y, w: 68, h: rect.h + 30 }
        : { x: rect.x - 6 - frame.x, y: rect.y - 6 - frame.y, w: rect.w + 12, h: rect.h + 12 }
      : null;
  // Kept inside the screen, so the ring around the last tab isn't cut off.
  const hole = raw && frame ? { ...raw, x: Math.max(2, raw.x), w: Math.min(frame.w - 2, raw.x + raw.w) - Math.max(2, raw.x) } : null;
  // The card goes on the roomier side of the window; the welcome card sits in the middle.
  const cardPlace: ViewStyle | null = !frame
    ? null
    : welcome
      ? { top: 0, bottom: 0, justifyContent: 'center' }
      : !hole
        ? null
        : hole.y + hole.h / 2 < frame.h / 2
          ? { top: hole.y + hole.h + 12 }
          : { bottom: frame.h - hole.y + 12 };

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onSkip}>
      <View ref={root} onLayout={onLayout} style={StyleSheet.absoluteFill}>
        {hole ? (
          <>
            <View style={[s.dim, { top: 0, left: 0, right: 0, height: Math.max(0, hole.y) }]} />
            <View style={[s.dim, { top: hole.y + hole.h, left: 0, right: 0, bottom: 0 }]} />
            <View style={[s.dim, { top: hole.y, left: 0, width: Math.max(0, hole.x), height: hole.h }]} />
            <View style={[s.dim, { top: hole.y, left: hole.x + hole.w, right: 0, height: hole.h }]} />
            <View pointerEvents="none" style={[s.ring, { top: hole.y, left: hole.x, width: hole.w, height: hole.h }]} />
          </>
        ) : (
          <View style={[s.dim, StyleSheet.absoluteFill]} />
        )}

        {cardPlace && (
          <View style={[s.cardWrap, cardPlace]} pointerEvents="box-none">
            <View style={s.card}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt v="caption" tone="textMuted">
                  {number} / {total}
                </Txt>
                {!last && (
                  <Pressable onPress={onSkip} hitSlop={12}>
                    <Txt v="smallStrong" tone="accent">
                      {tr('Пропусни', 'Skip')}
                    </Txt>
                  </Pressable>
                )}
              </Row>
              <Txt v={welcome ? 'h2' : 'h3'}>{step.title}</Txt>
              <Txt tone="textMuted">{step.text}</Txt>
              <Row gap={8} style={{ justifyContent: 'flex-end', marginTop: 4 }}>
                {number > 1 && <Button label={tr('Назад', 'Back')} variant="secondary" small onPress={onBack} />}
                <Button label={welcome ? tr('Да започваме', 'Let’s go') : last ? tr('Готово', 'Done') : tr('Напред', 'Next')} small onPress={last ? onSkip : onNext} />
              </Row>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((t) => ({
  dim: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.72)' },
  ring: { position: 'absolute', borderRadius: 16, borderWidth: 2, borderColor: t.c.accent },
  cardWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: 16 },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: t.c.surface,
    borderRadius: 20,
    padding: 18,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
}));
