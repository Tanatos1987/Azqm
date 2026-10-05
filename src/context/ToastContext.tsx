import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Txt } from '@/components/ui';
import { useTheme } from '@/theme/ThemeContext';

interface ToastOptions {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
}

interface ToastValue {
  show: (opts: ToastOptions | string) => void;
}

const ToastContext = createContext<ToastValue | null>(null);

/** Small snackbar at the bottom ("Добавено: … · Отмени") instead of blocking alerts. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastOptions | null>(null);
  const [anim] = useState(() => new Animated.Value(0));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setToast(null));
  }, [anim]);

  const show = useCallback(
    (opts: ToastOptions | string) => {
      const o = typeof opts === 'string' ? { message: opts } : opts;
      if (timer.current) clearTimeout(timer.current);
      setToast(o);
      anim.setValue(0);
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 8 }).start();
      timer.current = setTimeout(hide, o.durationMs ?? (o.actionLabel ? 4500 : 2500));
    },
    [anim, hide]
  );

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.wrap,
            {
              bottom: insets.bottom + 76,
              opacity: anim,
              transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
            },
          ]}
        >
          <View style={[styles.toast, { backgroundColor: t.dark ? '#2B3240' : '#1F2633' }]}>
            <Txt v="smallStrong" color="#F3F5F8" style={{ flex: 1 }} numberOfLines={2}>
              {toast.message}
            </Txt>
            {toast.actionLabel && (
              <Pressable
                hitSlop={10}
                onPress={() => {
                  toast.onAction?.();
                  hide();
                }}
              >
                <Txt v="smallStrong" color={t.dark ? t.c.accent : '#4ADE80'}>
                  {toast.actionLabel}
                </Txt>
              </Pressable>
            )}
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast трябва да се използва вътре в <ToastProvider>.');
  return ctx;
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
});
