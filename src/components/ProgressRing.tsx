import React, { useId } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTween } from '@/hooks/useTween';
import { useTheme } from '@/theme/ThemeContext';

interface ProgressRingProps {
  size?: number;
  strokeWidth?: number;
  progress: number; // 0..1
  /** one colour, or `colors` for a gradient (top → bottom) */
  color?: string;
  colors?: readonly [string, string];
  trackColor?: string;
  /** 0 none, 1 soft, 2 strong; defaults to the theme's */
  glow?: number;
  /** false: draw the value straight away (small previews) */
  animate?: boolean;
  children?: React.ReactNode;
}

/** Room around the ring for the glow, which is wider than the ring itself. */
const GLOW_PAD = 8;

export function ProgressRing({ size = 120, strokeWidth = 10, progress, color, colors, trackColor, glow, animate = true, children }: ProgressRingProps) {
  const t = useTheme();
  const gradientId = `ring${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [from, to] = colors ?? [color ?? t.c.accent, color ?? t.c.accent];
  const glowLevel = glow ?? t.fx.glow;
  const pad = glowLevel > 0 ? GLOW_PAD : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const target = Math.max(0, Math.min(progress, 1));
  const tweened = useTween(target, 900, 0, 0.02);
  const value = animate ? tweened : target;
  const dashOffset = circumference * (1 - value);
  const center = size / 2 + pad;
  const arc = {
    cx: center,
    cy: center,
    r: radius,
    stroke: `url(#${gradientId})`,
    fill: 'none',
    strokeDasharray: `${circumference} ${circumference}`,
    strokeDashoffset: dashOffset,
    strokeLinecap: 'round' as const,
    rotation: -90,
    origin: `${center}, ${center}`,
  };

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* The drawing is larger than the view by the glow's room on each side; React Native doesn't clip it. */}
      <Svg width={size + pad * 2} height={size + pad * 2} style={{ position: 'absolute', left: -pad, top: -pad }}>
        <Defs>
          <LinearGradient id={gradientId} x1="0.5" y1="0" x2="0.5" y2="1">
            <Stop offset="0" stopColor={from} />
            <Stop offset="1" stopColor={to} />
          </LinearGradient>
        </Defs>
        <Circle cx={center} cy={center} r={radius} stroke={trackColor ?? t.c.track} strokeWidth={strokeWidth} fill="none" />
        {value > 0.002 && glowLevel > 0 && (
          <>
            <Circle {...arc} strokeWidth={strokeWidth + 14} strokeOpacity={0.07 * glowLevel} />
            <Circle {...arc} strokeWidth={strokeWidth + 7} strokeOpacity={0.13 * glowLevel} />
          </>
        )}
        {value > 0.002 && <Circle {...arc} strokeWidth={strokeWidth} />}
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>{children}</View>
    </View>
  );
}
