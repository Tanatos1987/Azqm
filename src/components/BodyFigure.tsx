import React, { useEffect, useMemo, useState } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Defs, Ellipse, G, LinearGradient, Path, Stop } from 'react-native-svg';
import type { Sex } from '@/types';
import { useTween } from '@/hooks/useTween';
import { useTheme } from '@/theme/ThemeContext';
import { mix } from '@/theme/themes';
import { fatnessOf, silhouette } from './figure/silhouette';

interface BodyFigureProps {
  bmi: number;
  sex: Sex;
  /** rendered height in px; width follows the 2:3 box */
  size?: number;
  /** BMI the figure starts from on first render, so it visibly morphs into `bmi` */
  fromBmi?: number;
}

/**
 * A realistic body silhouette (no face, no clothes) whose shape is driven by BMI: every time `bmi`
 * changes the outline tweens to the new value, and the figure gently "breathes". It replaced the
 * cartoon boy/girl (owner, 24.11.2026). Deep Glass draws it as frosted glass with a soft glow, the
 * other themes as a shaded volume in their own colours.
 */
export function BodyFigure({ bmi, sex, size = 240, fromBmi }: BodyFigureProps) {
  const t = useTheme();
  const shownBmi = useTween(bmi, 1400, fromBmi);
  const shape = useMemo(() => silhouette(shownBmi, sex), [shownBmi, sex]);
  const f = fatnessOf(shownBmi);
  const [breath] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [breath]);

  const glass = t.fx.figure === 'glass';
  const top = glass ? 'rgba(255,255,255,0.20)' : mix(t.c.textMuted, t.c.accent, 0.12);
  const bottom = glass ? 'rgba(255,255,255,0.10)' : mix(t.c.textMuted, t.c.bg, 0.5);
  const edge = glass ? 'rgba(255,255,255,0.72)' : mix(t.c.textMuted, t.c.text, 0.35);
  const parts = [shape.armL, shape.armR, shape.body];
  const scale = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.01] });

  return (
    <Animated.View style={{ width: (size * 2) / 3, height: size, transform: [{ scale }] }}>
      <Svg width="100%" height="100%" viewBox="-30 -4 260 448" preserveAspectRatio="xMidYMid meet">
        <Defs>
          <LinearGradient id="fig-fill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={top} />
            <Stop offset="1" stopColor={bottom} />
          </LinearGradient>
          <LinearGradient id="fig-side" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#000" stopOpacity={0.32} />
            <Stop offset="0.35" stopColor="#000" stopOpacity={0} />
            <Stop offset="0.65" stopColor="#000" stopOpacity={0} />
            <Stop offset="1" stopColor="#000" stopOpacity={0.32} />
          </LinearGradient>
        </Defs>
        <Ellipse cx={100} cy={437} rx={44 + f * 30} ry={6} fill="#000" opacity={t.dark ? 0.35 : 0.12} />
        {glass && (
          // soft glow around the frosted figure
          <G opacity={0.35}>
            {parts.map((d, i) => (
              <Path key={i} d={d} fill="none" stroke={t.c.accent} strokeWidth={7} />
            ))}
            <Ellipse cx={shape.head.cx} cy={shape.head.cy} rx={shape.head.rx} ry={shape.head.ry} fill="none" stroke={t.c.accent} strokeWidth={7} />
          </G>
        )}
        {parts.map((d, i) => (
          <G key={i} opacity={i < 2 ? 0.88 : 1}>
            <Path d={d} fill="url(#fig-fill)" />
            {!glass && <Path d={d} fill="url(#fig-side)" />}
            <Path d={d} fill="none" stroke={edge} strokeOpacity={glass ? 1 : 0.4} strokeWidth={1.6} />
          </G>
        ))}
        <Ellipse cx={shape.head.cx} cy={shape.head.cy} rx={shape.head.rx} ry={shape.head.ry} fill="url(#fig-fill)" />
        {!glass && <Ellipse cx={shape.head.cx} cy={shape.head.cy} rx={shape.head.rx} ry={shape.head.ry} fill="url(#fig-side)" />}
        <Ellipse cx={shape.head.cx} cy={shape.head.cy} rx={shape.head.rx} ry={shape.head.ry} fill="none" stroke={edge} strokeOpacity={glass ? 1 : 0.4} strokeWidth={1.6} />
      </Svg>
    </Animated.View>
  );
}
