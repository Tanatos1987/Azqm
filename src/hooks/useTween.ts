import { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';

const EASE = Easing.inOut(Easing.cubic);

/**
 * Smoothly animates a number towards `target` and returns the current value.
 * Drives SVG attributes (paths, stroke offsets, bar heights), which the native
 * driver can't animate — so this runs on the JS thread via a listener.
 * `from` is only used for the very first render.
 * Changes smaller than `snap` jump straight to the target: the fasting ring moves a tiny step every second,
 * and animating each step kept the JS thread re-rendering all the time, so taps on the tab bar had to wait.
 */
export function useTween(target: number, duration = 700, from?: number, snap = 0): number {
  const [anim] = useState(() => new Animated.Value(from ?? target));
  const [value, setValue] = useState(from ?? target);
  const latest = useRef(from ?? target);

  useEffect(() => {
    const id = anim.addListener(({ value: v }) => {
      latest.current = v;
      setValue(v);
    });
    return () => anim.removeListener(id);
  }, [anim]);

  useEffect(() => {
    if (Math.abs(target - latest.current) < snap) {
      anim.setValue(target);
      return;
    }
    const animation = Animated.timing(anim, { toValue: target, duration, easing: EASE, useNativeDriver: false });
    animation.start();
    return () => animation.stop();
  }, [anim, target, duration, snap]);

  return value;
}
