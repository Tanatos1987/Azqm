import { useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';

const EASE = Easing.inOut(Easing.cubic);

/**
 * Smoothly animates a number towards `target` and returns the current value.
 * Drives SVG attributes (paths, stroke offsets, bar heights), which the native
 * driver can't animate — so this runs on the JS thread via a listener.
 * `from` is only used for the very first render.
 */
export function useTween(target: number, duration = 700, from?: number): number {
  const [anim] = useState(() => new Animated.Value(from ?? target));
  const [value, setValue] = useState(from ?? target);

  useEffect(() => {
    const id = anim.addListener(({ value: v }) => setValue(v));
    return () => anim.removeListener(id);
  }, [anim]);

  useEffect(() => {
    const animation = Animated.timing(anim, { toValue: target, duration, easing: EASE, useNativeDriver: false });
    animation.start();
    return () => animation.stop();
  }, [anim, target, duration]);

  return value;
}
