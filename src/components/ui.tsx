/**
 * Shared UI building blocks. Everything reads the active theme (dark/light, text size), so screens only
 * describe layout. <Txt> applies the Inter font and the user's text-size setting to every label.
 */
import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type ScrollViewProps,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONT, TYPE, makeStyles, useTheme, type TypeVariant } from '@/theme/ThemeContext';
import type { Palette } from '@/theme/palette';

type Tone = keyof Pick<Palette, 'text' | 'textMuted' | 'textFaint' | 'accent' | 'onAccent' | 'danger' | 'warning' | 'success' | 'info' | 'protein' | 'fat' | 'carbs' | 'fiber' | 'water'>;

// ---- text -----------------------------------------------------------------------

interface TxtProps extends TextProps {
  v?: TypeVariant;
  tone?: Tone;
  color?: string;
  center?: boolean;
}

export function Txt({ v = 'body', tone = 'text', color, center, style, ...rest }: TxtProps) {
  const t = useTheme();
  const flat = StyleSheet.flatten([TYPE[v] as TextStyle, style]) ?? {};
  const fontSize = (flat.fontSize ?? 16) * t.scale;
  const lineHeight = flat.lineHeight != null ? flat.lineHeight * t.scale : undefined;
  return (
    <Text
      maxFontSizeMultiplier={1.4}
      {...rest}
      style={[{ fontFamily: FONT, color: t.c[tone] }, flat, { fontSize, lineHeight }, color ? { color } : null, center ? { textAlign: 'center' } : null]}
    />
  );
}

export const Input = React.forwardRef<TextInput, TextInputProps & { big?: boolean }>(function Input({ style, big, ...rest }, ref) {
  const t = useTheme();
  const s = useStyles();
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={t.c.textFaint}
      selectionColor={t.c.accent}
      maxFontSizeMultiplier={1.4}
      {...rest}
      style={[s.input, { fontSize: (big ? 20 : 16) * t.scale }, big && s.inputBig, style]}
    />
  );
});

// ---- layout ---------------------------------------------------------------------

interface ScreenProps {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  left?: React.ReactNode;
  children: React.ReactNode;
  scroll?: boolean;
  scrollProps?: ScrollViewProps;
  padded?: boolean;
}

export function Screen({ title, subtitle, right, left, children, scroll, scrollProps, padded = true }: ScreenProps) {
  const s = useStyles();
  const body = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      {...scrollProps}
      contentContainerStyle={[padded && s.padX, { paddingBottom: 48 }, scrollProps?.contentContainerStyle]}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, padded && s.padX]}>{children}</View>
  );
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {(title || right || left) && (
          <View style={[s.header, s.padX]}>
            {left}
            <View style={{ flex: 1 }}>
              {title ? (
                <Txt v="h1" numberOfLines={1}>
                  {title}
                </Txt>
              ) : null}
              {subtitle ? (
                <Txt v="small" tone="textMuted" numberOfLines={2}>
                  {subtitle}
                </Txt>
              ) : null}
            </View>
            {right}
          </View>
        )}
        {body}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Card({ children, style, onPress, tight }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; tight?: boolean }) {
  const s = useStyles();
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [s.card, tight && s.cardTight, pressed && s.pressed, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[s.card, tight && s.cardTight, style]}>{children}</View>;
}

export function SectionHeader({ title, action, onAction, style }: { title: string; action?: string; onAction?: () => void; style?: StyleProp<ViewStyle> }) {
  const s = useStyles();
  return (
    <View style={[s.sectionHeader, style]}>
      <Txt v="h3" style={{ flex: 1 }}>
        {title}
      </Txt>
      {action && (
        <Pressable onPress={onAction} hitSlop={10}>
          <Txt v="smallStrong" tone="accent">
            {action}
          </Txt>
        </Pressable>
      )}
    </View>
  );
}

export function Row({ children, gap = 8, style }: { children: React.ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const s = useStyles();
  return <View style={[s.divider, style]} />;
}

// ---- controls -------------------------------------------------------------------

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  variant?: ButtonVariant;
  icon?: React.ReactNode;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
  flex?: boolean;
}

export function Button({ label, variant = 'primary', icon, small, style, flex, disabled, ...rest }: ButtonProps) {
  const t = useTheme();
  const s = useStyles();
  const bg = { primary: t.c.accent, secondary: t.c.surfaceAlt, ghost: 'transparent', danger: t.c.dangerSoft }[variant];
  const fg = { primary: t.c.onAccent, secondary: t.c.text, ghost: t.c.accent, danger: t.c.danger }[variant];
  return (
    <Pressable
      disabled={disabled}
      {...rest}
      style={({ pressed }) => [s.button, small && s.buttonSmall, { backgroundColor: bg }, flex && { flex: 1 }, (pressed || disabled) && { opacity: disabled ? 0.45 : 0.8 }, style]}
    >
      {icon}
      <Txt v={small ? 'smallStrong' : 'bodyStrong'} color={fg} numberOfLines={1}>
        {label}
      </Txt>
    </Pressable>
  );
}

export function IconButton({ children, onPress, size = 44, style, tint, accessibilityLabel }: { children: React.ReactNode; onPress?: () => void; size?: number; style?: StyleProp<ViewStyle>; tint?: string; accessibilityLabel?: string }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        { width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: tint ?? t.c.surface },
        pressed && { opacity: 0.7 },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

export function Chip({ label, active, onPress, icon, style, color }: { label: string; active?: boolean; onPress?: () => void; icon?: React.ReactNode; style?: StyleProp<ViewStyle>; color?: string }) {
  const t = useTheme();
  const s = useStyles();
  const activeBg = color ?? t.c.accent;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.chip, active && { backgroundColor: activeBg, borderColor: activeBg }, pressed && { opacity: 0.75 }, style]}>
      {icon}
      <Txt v="smallStrong" color={active ? t.c.onAccent : t.c.text} numberOfLines={1}>
        {label}
      </Txt>
    </Pressable>
  );
}

export function Segmented<T extends string>({ options, value, onChange, style }: { options: { label: string; value: T }[]; value: T; onChange: (v: T) => void; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const s = useStyles();
  return (
    <View style={[s.segmented, style]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[s.segment, active && { backgroundColor: t.c.accent }]}>
            <Txt v="smallStrong" color={active ? t.c.onAccent : t.c.textMuted} numberOfLines={1} center>
              {o.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Horizontal progress bar; `value / max`, optional color, thin or regular. */
export function Bar({ value, max, color, height = 10, style, marker }: { value: number; max: number; color?: string; height?: number; style?: StyleProp<ViewStyle>; marker?: number }) {
  const t = useTheme();
  const pct = max > 0 ? Math.max(0, Math.min(value / max, 1)) : 0;
  return (
    <View style={[{ height, borderRadius: height / 2, backgroundColor: t.c.track, overflow: 'hidden' }, style]}>
      <View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: height / 2, backgroundColor: color ?? t.c.accent }} />
      {marker != null && max > 0 && (
        <View style={{ position: 'absolute', left: `${Math.min(marker / max, 1) * 100}%`, top: 0, bottom: 0, width: 2, backgroundColor: t.c.text, opacity: 0.6 }} />
      )}
    </View>
  );
}

export function Dot({ color, size = 10 }: { color: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />;
}

export function Badge({ label, color, soft }: { label: string; color: string; soft?: string }) {
  return (
    <View style={{ backgroundColor: soft ?? `${color}22`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start' }}>
      <Txt v="caption" color={color} style={{ fontWeight: '700' }}>
        {label}
      </Txt>
    </View>
  );
}

export function EmptyState({ emoji, title, text, children }: { emoji: string; title: string; text?: string; children?: React.ReactNode }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 28, paddingHorizontal: 16, gap: 6 }}>
      <Text style={{ fontSize: 40 }}>{emoji}</Text>
      <Txt v="h3" center>
        {title}
      </Txt>
      {text ? (
        <Txt v="small" tone="textMuted" center>
          {text}
        </Txt>
      ) : null}
      {children}
    </View>
  );
}

/** Bottom sheet built on Modal: tap outside or the back button to close. */
export function Sheet({ visible, onClose, children, title }: { visible: boolean; onClose: () => void; children: React.ReactNode; title?: string }) {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={s.backdrop} onPress={onClose} />
        <View style={[s.sheet, { paddingBottom: insets.bottom + 8 }]}>
          <View style={s.handle} />
          {title ? (
            <Txt v="h2" style={{ marginBottom: 12 }}>
              {title}
            </Txt>
          ) : null}
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const useStyles = makeStyles((t) => ({
  safe: { flex: 1, backgroundColor: t.c.bg },
  padX: { paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 10, paddingBottom: 14 },
  card: {
    backgroundColor: t.c.surface,
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    borderWidth: t.dark ? 0 : StyleSheet.hairlineWidth,
    borderColor: t.c.border,
    shadowColor: t.c.shadow,
    shadowOpacity: t.dark ? 0 : 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: t.dark ? 0 : 1,
  },
  cardTight: { padding: 14 },
  pressed: { opacity: 0.85 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 10 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: t.c.border, marginVertical: 12 },
  input: {
    backgroundColor: t.c.surfaceAlt,
    color: t.c.text,
    fontFamily: FONT,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: t.c.border,
  },
  inputBig: { fontWeight: '700', textAlign: 'center', paddingVertical: 12 },
  button: {
    minHeight: 52,
    borderRadius: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonSmall: { minHeight: 40, borderRadius: 12, paddingHorizontal: 14 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: t.c.surfaceAlt,
    borderWidth: 1,
    borderColor: t.c.border,
  },
  segmented: { flexDirection: 'row', backgroundColor: t.c.surfaceAlt, borderRadius: 14, padding: 4, gap: 4 },
  segment: { flex: 1, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: t.c.overlay },
  sheet: {
    backgroundColor: t.c.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: '88%',
  },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: t.c.border, marginBottom: 14 },
}));
