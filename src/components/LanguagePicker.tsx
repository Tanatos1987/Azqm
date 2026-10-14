import React, { useState } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { Chip, Sheet, Txt } from '@/components/ui';
import { CheckIcon, ChevronRightIcon, GlobeIcon } from '@/components/icons';
import { useSettings } from '@/context/SettingsContext';
import { LANGUAGES, languageInfo, tr, useI18n, type Lang } from '@/i18n';
import { makeStyles, useTheme } from '@/theme/ThemeContext';

/** The language's name in the current UI language ("немски" next to "Deutsch"). */
function localName(code: Lang): string {
  switch (code) {
    case 'bg':
      return tr('Български', 'Bulgarian');
    case 'en':
      return tr('Английски', 'English');
    case 'de':
      return tr('Немски', 'German');
    case 'es':
      return tr('Испански', 'Spanish');
    case 'fr':
      return tr('Френски', 'French');
    case 'it':
      return tr('Италиански', 'Italian');
    case 'ru':
      return tr('Руски', 'Russian');
    case 'tr':
      return tr('Турски', 'Turkish');
  }
}

/** All app languages, each written in itself; the current one is checked. Picking one switches the app at once. */
function LanguageList({ onPicked }: { onPicked?: () => void }) {
  const t = useTheme();
  const s = useStyles();
  const { lang } = useI18n();
  const { update } = useSettings();
  return (
    <View style={{ gap: 6 }}>
      {LANGUAGES.map((l) => {
        const active = l.code === lang;
        return (
          <Pressable
            key={l.code}
            onPress={() => {
              update({ language: l.code });
              onPicked?.();
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [s.row, active && s.rowActive, pressed && { opacity: 0.75 }]}
          >
            <View style={{ flex: 1 }}>
              <Txt v="bodyStrong">{l.name}</Txt>
              {l.name !== localName(l.code) && (
                <Txt v="caption" tone="textMuted">
                  {localName(l.code)}
                </Txt>
              )}
            </View>
            {active && <CheckIcon size={22} color={t.c.accent} />}
          </Pressable>
        );
      })}
    </View>
  );
}

function useLanguageSheet() {
  const [open, setOpen] = useState(false);
  const sheet = (
    <Sheet visible={open} onClose={() => setOpen(false)} title={tr('Език', 'Language')}>
      <LanguageList onPicked={() => setOpen(false)} />
    </Sheet>
  );
  return { open: () => setOpen(true), sheet };
}

/** Globe + language code ("BG") for screen headers; opens the language list. */
export function LanguageButton({ style }: { style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const s = useStyles();
  const { lang } = useI18n();
  const { open, sheet } = useLanguageSheet();
  return (
    <>
      <Pressable
        onPress={open}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={tr('Смени езика', 'Change language')}
        style={({ pressed }) => [s.button, pressed && { opacity: 0.7 }, style]}
      >
        <GlobeIcon size={20} color={t.c.text} />
        <Txt v="smallStrong">{lang.toUpperCase()}</Txt>
      </Pressable>
      {sheet}
    </>
  );
}

/** Settings row: the current language by name; opens the language list. */
export function LanguageRow() {
  const t = useTheme();
  const s = useStyles();
  const { lang } = useI18n();
  const { open, sheet } = useLanguageSheet();
  return (
    <>
      <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={tr('Смени езика', 'Change language')} style={({ pressed }) => [s.select, pressed && { opacity: 0.75 }]}>
        <GlobeIcon size={22} color={t.c.accent} />
        <Txt v="bodyStrong" style={{ flex: 1 }}>
          {languageInfo(lang).name}
        </Txt>
        <ChevronRightIcon size={20} color={t.c.textMuted} />
      </Pressable>
      {sheet}
    </>
  );
}

/** First screen of a new install: every language as a chip, so it can be switched before reading anything else. */
export function LanguageChips() {
  const { lang } = useI18n();
  const { update } = useSettings();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {LANGUAGES.map((l) => (
        <Chip key={l.code} label={l.name} active={l.code === lang} onPress={() => update({ language: l.code })} />
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 22,
    backgroundColor: t.c.surface,
    borderWidth: t.dark ? 0 : 1,
    borderColor: t.c.border,
  },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: t.c.surfaceAlt,
    borderWidth: 1,
    borderColor: t.c.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: t.c.surfaceAlt,
  },
  rowActive: { backgroundColor: t.c.accentSoft },
}));
