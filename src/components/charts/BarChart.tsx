import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';
import { Txt } from '@/components/ui';
import { useTween } from '@/hooks/useTween';
import { useTheme } from '@/theme/ThemeContext';
import type { ChartPoint } from './LineChart';

interface BarChartProps {
  data: ChartPoint[];
  color: string;
  /** bars above the goal are drawn in `overColor`; a dashed goal line is shown */
  goal?: number;
  overColor?: string;
  height?: number;
  /** show the value above each bar (only when there are few bars) */
  showValues?: boolean;
}

const PAD = { top: 22, bottom: 24 };

export function BarChart({ data, color, goal, overColor, height = 180, showValues = true }: BarChartProps) {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const grow = useTween(1, 900, 0);

  const max = Math.max(...data.map((d) => d.value), goal ?? 0, 1) * 1.12;
  const plotH = height - PAD.top - PAD.bottom;
  const slot = data.length > 0 ? width / data.length : 0;
  const barW = Math.max(Math.min(slot * 0.6, 30), 2);
  const yOf = (v: number) => PAD.top + plotH - (v / max) * plotH;
  const labelEvery = Math.max(1, Math.ceil(data.length / 8));
  const values = showValues && data.length <= 10;

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
      {width > 0 && (
        <>
          <Svg width={width} height={height}>
            <Line x1={0} x2={width} y1={PAD.top + plotH} y2={PAD.top + plotH} stroke={t.c.border} strokeWidth={1} />
            {data.map((d, i) => {
              const h = (d.value / max) * plotH * grow;
              const over = goal != null && goal > 0 && d.value > goal * 1.05;
              return (
                <Rect
                  key={i}
                  x={i * slot + (slot - barW) / 2}
                  y={PAD.top + plotH - h}
                  width={barW}
                  height={Math.max(h, 0)}
                  rx={Math.min(7, barW / 2)}
                  fill={d.value === 0 ? t.c.surfaceAlt : over ? overColor ?? t.c.warning : color}
                />
              );
            })}
            {goal != null && goal > 0 && (
              <Line x1={0} x2={width} y1={yOf(goal)} y2={yOf(goal)} stroke={t.c.text} strokeOpacity={0.45} strokeWidth={1.5} strokeDasharray="6 5" />
            )}
          </Svg>
          {data.map((d, i) => (
            <React.Fragment key={i}>
              {values && d.value > 0 && (
                <Txt v="caption" tone="textMuted" style={[styles.valueLabel, { left: i * slot - 6, width: slot + 12, top: Math.max(yOf(d.value * grow) - 19, 0) }]}>
                  {Math.round(d.value)}
                </Txt>
              )}
              {(i % labelEvery === 0 || i === data.length - 1) && (
                <Txt v="caption" tone="textFaint" style={[styles.xLabel, { left: i * slot - 14, width: slot + 28, top: height - 19 }]}>
                  {d.label}
                </Txt>
              )}
            </React.Fragment>
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  valueLabel: { position: 'absolute', textAlign: 'center' },
  xLabel: { position: 'absolute', textAlign: 'center' },
});
