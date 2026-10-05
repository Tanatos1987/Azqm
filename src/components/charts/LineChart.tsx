import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { Txt } from '@/components/ui';
import { useTween } from '@/hooks/useTween';
import { useTheme } from '@/theme/ThemeContext';

export interface ChartPoint {
  label: string;
  value: number;
}

interface LineChartProps {
  data: ChartPoint[];
  color: string;
  height?: number;
  unit?: string;
  /** optional dashed reference line (e.g. target weight) */
  target?: number | null;
}

const PAD = { top: 22, bottom: 24, left: 38, right: 14 };

export function LineChart({ data, color, height = 190, unit = '', target }: LineChartProps) {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  // Rises from the baseline on mount.
  const grow = useTween(1, 900, 0);

  const values = data.map((d) => d.value);
  if (target != null) values.push(target);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const spread = Math.max(rawMax - rawMin, 1);
  const min = rawMin - spread * 0.15;
  const max = rawMax + spread * 0.15;

  const plotW = Math.max(width - PAD.left - PAD.right, 1);
  const plotH = height - PAD.top - PAD.bottom;
  const xOf = (i: number) => PAD.left + (data.length > 1 ? (i / (data.length - 1)) * plotW : plotW / 2);
  const yOf = (v: number) => PAD.top + plotH - ((v - min) / (max - min)) * plotH;
  const baseY = PAD.top + plotH;
  const animY = (v: number) => baseY + (yOf(v) - baseY) * grow;

  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xOf(i)} ${animY(d.value)}`).join(' ');
  const area = data.length > 1 ? `${line} L ${xOf(data.length - 1)} ${baseY} L ${xOf(0)} ${baseY} Z` : '';
  const last = data[data.length - 1];
  const gridValues = [max - (max - min) * 0.15, (max + min) / 2, min + (max - min) * 0.15];
  const labelEvery = Math.max(1, Math.ceil(data.length / 5));

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
      {width > 0 && data.length > 0 && (
        <>
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={color} stopOpacity={0.32} />
                <Stop offset="1" stopColor={color} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {gridValues.map((v, i) => (
              <Line key={i} x1={PAD.left} x2={width - PAD.right} y1={yOf(v)} y2={yOf(v)} stroke={t.c.border} strokeWidth={1} />
            ))}
            {target != null && (
              <Line x1={PAD.left} x2={width - PAD.right} y1={yOf(target)} y2={yOf(target)} stroke={t.c.success} strokeWidth={1.5} strokeDasharray="6 5" />
            )}
            {area ? <Path d={area} fill="url(#area)" /> : null}
            <Path d={line} stroke={color} strokeWidth={3} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            {data.map((d, i) => (
              <Circle
                key={i}
                cx={xOf(i)}
                cy={animY(d.value)}
                r={i === data.length - 1 ? 5.5 : 3.5}
                fill={i === data.length - 1 ? color : t.c.surface}
                stroke={color}
                strokeWidth={2}
              />
            ))}
          </Svg>
          {gridValues.map((v, i) => (
            <Txt key={i} v="caption" tone="textFaint" style={[styles.yLabel, { top: yOf(v) - 9 }]}>
              {Math.round(v)}
            </Txt>
          ))}
          {data.map((d, i) =>
            i % labelEvery === 0 || i === data.length - 1 ? (
              <Txt key={i} v="caption" tone="textFaint" style={[styles.xLabel, { left: xOf(i) - 28, top: height - 19 }]}>
                {d.label}
              </Txt>
            ) : null
          )}
          {last && (
            <Txt
              v="smallStrong"
              color={color}
              style={[styles.lastLabel, { left: Math.min(Math.max(xOf(data.length - 1) - 40, 0), width - 80), top: Math.max(animY(last.value) - 28, 0) }]}
            >
              {last.value.toFixed(1)} {unit}
            </Txt>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  yLabel: { position: 'absolute', left: 0, width: 34, textAlign: 'right' },
  xLabel: { position: 'absolute', width: 56, textAlign: 'center' },
  lastLabel: { position: 'absolute', width: 80, textAlign: 'center' },
});
