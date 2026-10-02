import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';
import { colors } from '@/theme/colors';
import { useTween } from '@/hooks/useTween';
import type { ChartPoint } from './LineChart';

interface BarChartProps {
  data: ChartPoint[];
  color: string;
  /** bars above the goal are drawn in `overColor`; a dashed goal line is shown */
  goal?: number;
  overColor?: string;
  height?: number;
}

const PAD = { top: 18, bottom: 22 };

export function BarChart({ data, color, goal, overColor = colors.warning, height = 170 }: BarChartProps) {
  const [width, setWidth] = useState(0);
  const grow = useTween(1, 900, 0);

  const max = Math.max(...data.map((d) => d.value), goal ?? 0, 1) * 1.1;
  const plotH = height - PAD.top - PAD.bottom;
  const slot = data.length > 0 ? width / data.length : 0;
  const barW = Math.min(slot * 0.55, 28);
  const yOf = (v: number) => PAD.top + plotH - (v / max) * plotH;

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
      {width > 0 && (
        <>
          <Svg width={width} height={height}>
            <Line x1={0} x2={width} y1={PAD.top + plotH} y2={PAD.top + plotH} stroke={colors.border} strokeWidth={1} />
            {data.map((d, i) => {
              const h = (d.value / max) * plotH * grow;
              const over = goal != null && d.value > goal;
              return (
                <Rect
                  key={i}
                  x={i * slot + (slot - barW) / 2}
                  y={PAD.top + plotH - h}
                  width={barW}
                  height={Math.max(h, 0)}
                  rx={6}
                  fill={d.value === 0 ? colors.surfaceAlt : over ? overColor : color}
                />
              );
            })}
            {goal != null && (
              <Line x1={0} x2={width} y1={yOf(goal)} y2={yOf(goal)} stroke={colors.text} strokeOpacity={0.5} strokeWidth={1.5} strokeDasharray="6 5" />
            )}
          </Svg>
          {data.map((d, i) => (
            <React.Fragment key={i}>
              {d.value > 0 && (
                <Text style={[styles.valueLabel, { left: i * slot, width: slot, top: Math.max(yOf(d.value * grow) - 15, 0) }]}>
                  {Math.round(d.value)}
                </Text>
              )}
              <Text style={[styles.xLabel, { left: i * slot, width: slot, top: height - 16 }]}>{d.label}</Text>
            </React.Fragment>
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  valueLabel: { position: 'absolute', textAlign: 'center', color: colors.textMuted, fontSize: 9 },
  xLabel: { position: 'absolute', textAlign: 'center', color: colors.textMuted, fontSize: 10 },
});
