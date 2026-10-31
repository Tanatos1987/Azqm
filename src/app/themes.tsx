/**
 * Theme picker (Настройки → Теми). Every tile is a small Today card drawn in that theme's colours, ring and fonts.
 * Free themes apply at once. Without Pro, a Pro theme is tried on live across the whole app, with a bar to unlock
 * the Pro themes; closing the Pro sheet without buying, the "free theme" button or leaving this screen puts the free
 * theme back. A purchase while trying one on keeps it.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, GradientFill, IconButton, Screen, Segmented, Txt } from '@/components/ui';
import { ProgressRing } from '@/components/ProgressRing';
import { SupportWizard } from '@/components/SupportWizard';
import { CheckIcon, ChevronLeftIcon, LockIcon } from '@/components/icons';
import { usePro } from '@/context/ProContext';
import { useSettings } from '@/context/SettingsContext';
import { useToast } from '@/context/ToastContext';
import { makeStyles, useTheme, useThemeControl, type ThemePref } from '@/theme/ThemeContext';
import { PRO_THEME_COUNT, THEMES, getThemeDef, resolveTheme, type ThemeDef } from '@/theme/themes';
import { useI18n } from '@/i18n';

export default function ThemesScreen() {
  const t = useTheme();
  const s = useStyles();
  const { tr } = useI18n();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { isPro } = usePro();
  const { themePref, update } = useSettings();
  const { activeId, previewId, setTheme, setPreview } = useThemeControl();
  const [paywall, setPaywall] = useState(false);
  const trying = previewId != null && !isPro ? getThemeDef(previewId) : null;

  // Leaving the screen ends a try-on.
  useEffect(() => () => setPreview(null), [setPreview]);

  // Pro bought while trying a theme on: keep that theme (the Pro sheet closes by itself, see below).
  useEffect(() => {
    if (!isPro || previewId == null) return;
    setTheme(previewId);
    setPreview(null);
    toast.show(tr('Темата е запазена. Благодарим! 💚', 'Theme saved. Thank you! 💚'));
  }, [isPro, previewId, setTheme, setPreview, toast, tr]);

  const choose = (def: ThemeDef) => {
    if (def.isPro && !isPro) {
      setPreview(def.id);
      return;
    }
    setPreview(null);
    setTheme(def.id);
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen
        title={tr('Теми', 'Themes')}
        subtitle={tr('Цветове, шрифтове и форми на целия Azqm', 'Colours, fonts and shapes for all of Azqm')}
        scroll
        scrollProps={{ contentContainerStyle: { paddingBottom: trying ? 230 + insets.bottom : 48 } }}
        left={
          <IconButton onPress={() => router.back()} accessibilityLabel={tr('Назад', 'Back')}>
            <ChevronLeftIcon size={24} color={t.c.text} />
          </IconButton>
        }
      >
        {!isPro && (
          <Txt v="small" tone="textMuted" style={{ marginBottom: 14 }}>
            {tr(
              'Две теми са безплатни. Докосни Pro тема, за да я пробваш в цялото приложение, преди да решиш.',
              'Two themes are free. Tap a Pro theme to try it on across the whole app before you decide.'
            )}
          </Txt>
        )}

        <View style={s.grid}>
          {THEMES.map((def) => (
            <ThemeTile key={def.id} def={def} active={def.id === activeId} locked={def.isPro && !isPro} onPress={() => choose(def)} />
          ))}
        </View>

        {activeId === 'classic' && (
          <Card style={{ marginTop: 16 }}>
            <Txt v="label" tone="textMuted" style={{ marginBottom: 8 }}>
              {tr('Класическа тема', 'Classic theme')}
            </Txt>
            <Segmented<ThemePref>
              value={themePref}
              onChange={(v) => update({ themePref: v })}
              options={[
                { label: tr('Като телефона', 'System'), value: 'system' },
                { label: tr('Тъмна', 'Dark'), value: 'dark' },
                { label: tr('Светла', 'Light'), value: 'light' },
              ]}
            />
          </Card>
        )}
      </Screen>

      {trying && (
        <View style={[s.tryBar, { paddingBottom: insets.bottom + 12 }]}>
          <Txt v="bodyStrong">{tr('Пробваш „{name}“', 'Trying on “{name}”', { name: trying.name() })}</Txt>
          <Txt v="caption" tone="textMuted" style={{ marginTop: 2, marginBottom: 12 }}>
            {tr('Безплатната тема се връща, когато излезеш от този екран.', 'The free theme comes back when you leave this screen.')}
          </Txt>
          <Button
            label={tr('Отключи всички {n} премиум теми с Azqm Pro', 'Unlock all {n} premium themes with Azqm Pro', { n: PRO_THEME_COUNT })}
            icon={<LockIcon size={20} color={t.c.onAccent} />}
            onPress={() => setPaywall(true)}
          />
          <Button label={tr('Върни безплатната тема', 'Back to the free theme')} variant="ghost" small onPress={() => setPreview(null)} style={{ marginTop: 4 }} />
        </View>
      )}

      {paywall && !isPro && (
        <SupportWizard
          initialStep={1}
          onClose={() => {
            setPaywall(false);
            // Closed without buying: back to the free theme.
            if (!isPro) setPreview(null);
          }}
        />
      )}
    </View>
  );
}

/** A small Today card in the theme's own colours, ring and fonts. */
function ThemeTile({ def, active, locked, onPress }: { def: ThemeDef; active: boolean; locked: boolean; onPress: () => void }) {
  const t = useTheme();
  const s = useStyles();
  const { tr } = useI18n();
  const { autoDark } = useThemeControl();
  const look = useMemo(() => resolveTheme(def, autoDark, 1), [def, autoDark]);
  const c = look.c;
  const scheme = def.scheme === 'auto' ? tr('Тъмна или светла', 'Dark or light') : def.scheme === 'dark' ? tr('Тъмна', 'Dark') : tr('Светла', 'Light');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${def.name()}${locked ? ', Pro' : ''}`}
      style={({ pressed }) => [s.tile, active && { borderColor: t.c.accent, borderWidth: 2 }, pressed && { opacity: 0.85 }]}
    >
      <View style={[s.canvas, { backgroundColor: c.bg }]}>
        {look.fx.bgGradient && <GradientFill colors={look.fx.bgGradient} />}
        <View style={[s.miniCard, { backgroundColor: c.card, borderColor: c.cardBorder, borderWidth: look.shape.border ? 1 : 0, borderRadius: Math.max(3, look.shape.radius * 0.6) }]}>
          <ProgressRing size={44} strokeWidth={6} progress={0.68} colors={look.ring} trackColor={c.track} glow={0} animate={false}>
            <Txt v="caption" color={c.text} style={{ fontFamily: look.font.num, fontWeight: '700', fontSize: 10, lineHeight: 12 }}>
              68%
            </Txt>
          </ProgressRing>
          <View style={{ flex: 1, gap: 5 }}>
            <MiniBar color={c.protein} track={c.track} pct={0.78} />
            <MiniBar color={c.fat} track={c.track} pct={0.52} />
            <MiniBar color={c.carbs} track={c.track} pct={0.3} />
          </View>
        </View>
        <View style={[s.miniButton, { backgroundColor: c.accent, borderRadius: Math.max(3, look.shape.control * 0.6) }]}>
          <Txt v="caption" color={c.onAccent} style={{ fontFamily: look.font.body, fontWeight: '700', fontSize: 11, lineHeight: 14 }}>
            + {tr('Добави', 'Add')}
          </Txt>
        </View>
        {locked && (
          <View style={s.proBadge}>
            <LockIcon size={11} color="#FFD166" strokeWidth={2.4} />
            <Txt v="caption" color="#FFFFFF" style={{ fontSize: 10, lineHeight: 13, fontWeight: '800', letterSpacing: 0.5 }}>
              PRO
            </Txt>
          </View>
        )}
        {active && (
          <View style={[s.check, { backgroundColor: t.c.accent }]}>
            <CheckIcon size={13} color={t.c.onAccent} strokeWidth={3} />
          </View>
        )}
      </View>
      <View style={{ paddingHorizontal: 10, paddingTop: 8, paddingBottom: 10 }}>
        <Txt v="smallStrong" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ fontFamily: look.font.display, fontWeight: '700' }}>
          {def.name()}
        </Txt>
        <Txt v="caption" tone="textMuted" numberOfLines={1}>
          {scheme} · {def.isPro ? 'Pro' : tr('безплатна', 'free')}
        </Txt>
      </View>
    </Pressable>
  );
}

function MiniBar({ color, track, pct }: { color: string; track: string; pct: number }) {
  return (
    <View style={{ height: 5, borderRadius: 3, backgroundColor: track, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: 3, backgroundColor: color }} />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    width: '46%',
    flexGrow: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: t.c.surface,
    borderWidth: 1,
    borderColor: t.c.cardBorder,
  },
  canvas: { height: 118, padding: 10, justifyContent: 'space-between', overflow: 'hidden' },
  miniCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8 },
  miniButton: { height: 24, alignItems: 'center', justifyContent: 'center' },
  proBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  check: { position: 'absolute', top: 6, left: 6, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  tryBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 14,
    backgroundColor: t.c.surface,
    borderTopWidth: 1,
    borderTopColor: t.c.cardBorder,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    boxShadow: '0px -8px 24px rgba(0,0,0,0.35)',
  },
}));
