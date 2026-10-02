/**
 * Small hand-built line-icon set using react-native-svg primitives only.
 *
 * Why not @expo/vector-icons: SDK 57 no longer bundles it (Expo deprecated it in
 * favor of per-family `@react-native-vector-icons/*` packages), and those
 * currently pull in a `react-dom@19.3.x` peer that conflicts with this
 * project's `react@19.2.3`. Rather than fight that upstream churn for a
 * handful of glyphs, these are drawn directly with the SVG primitives already
 * used for the progress rings — zero extra native dependencies, no font
 * loading, and reliable both in Expo Go and in the release APK.
 */
import React from 'react';
import type { ColorValue } from 'react-native';
import Svg, { Circle, Line, Path, Polygon, Polyline, Rect } from 'react-native-svg';

export interface IconProps {
  size?: number;
  color?: ColorValue;
  strokeWidth?: number;
}

const DEFAULTS = { size: 22, color: '#F5F6F8', strokeWidth: 1.8 };

export function TodayIcon({ size = DEFAULTS.size, color = DEFAULTS.color, strokeWidth = DEFAULTS.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={4} y={5} width={16} height={15} rx={2} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={4} y1={10} x2={20} y2={10} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={8} y1={3} x2={8} y2={7} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1={16} y1={3} x2={16} y2={7} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Rect x={9.5} y={13} width={5} height={4} rx={1} fill={color} />
    </Svg>
  );
}

export function AddIcon({ size = DEFAULTS.size, color = DEFAULTS.color, strokeWidth = DEFAULTS.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={12} y1={8} x2={12} y2={16} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1={8} y1={12} x2={16} y2={12} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function FastingIcon({ size = DEFAULTS.size, color = DEFAULTS.color, strokeWidth = DEFAULTS.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={13} r={8} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={12} y1={13} x2={12} y2={8} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1={12} y1={13} x2={16} y2={14.5} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1={9.5} y1={2} x2={14.5} y2={2} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function SettingsIcon({ size = DEFAULTS.size, color = DEFAULTS.color, strokeWidth = DEFAULTS.strokeWidth }: IconProps) {
  const rows: [number, number][] = [
    [5, 15],
    [8, 9],
    [16, 18],
  ];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {rows.map(([y, knobX], i) => (
        <React.Fragment key={i}>
          <Line x1={3} y1={y} x2={21} y2={y} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Circle cx={knobX} cy={y} r={2.3} fill={color} />
        </React.Fragment>
      ))}
    </Svg>
  );
}

export function CameraIcon({ size = DEFAULTS.size, color = DEFAULTS.color, strokeWidth = DEFAULTS.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={9} y={4} width={6} height={2.5} rx={0.6} fill={color} />
      <Rect x={3} y={6.5} width={18} height={13} rx={2} stroke={color} strokeWidth={strokeWidth} />
      <Circle cx={12} cy={13} r={4} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function BarcodeIcon({ size = DEFAULTS.size, color = DEFAULTS.color, strokeWidth = DEFAULTS.strokeWidth }: IconProps) {
  const bars: [number, number][] = [
    [4, 1.4],
    [6.5, 0.8],
    [8.5, 1.4],
    [11, 0.8],
    [13, 1.4],
    [15.5, 0.8],
    [17.5, 1.4],
    [19.6, 0.8],
  ];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={2.5} y={4} width={19} height={16} rx={2} stroke={color} strokeWidth={strokeWidth * 0.7} />
      {bars.map(([x, w], i) => (
        <Rect key={i} x={x} y={7} width={w} height={10} fill={color} />
      ))}
    </Svg>
  );
}

export function ManualEntryIcon({ size = DEFAULTS.size, color = DEFAULTS.color, strokeWidth = DEFAULTS.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={4} y={5} width={16} height={14} rx={2} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={7.5} y1={9.5} x2={16.5} y2={9.5} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1={7.5} y1={13} x2={14} y2={13} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1={7.5} y1={16.5} x2={11.5} y2={16.5} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function TrashIcon({ size = DEFAULTS.size, color = DEFAULTS.color, strokeWidth = DEFAULTS.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1={4} y1={7} x2={20} y2={7} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1={9} y1={4} x2={15} y2={4} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Rect x={6} y={7} width={12} height={13} rx={1.5} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={10} y1={10.5} x2={10} y2={16.5} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1={14} y1={10.5} x2={14} y2={16.5} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function DropletIcon({ size = DEFAULTS.size, color = DEFAULTS.color, strokeWidth = DEFAULTS.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={14} r={6.5} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={12} y1={3} x2={12} y2={9} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function BoltIcon({ size = DEFAULTS.size, color = DEFAULTS.color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polygon points="13,2 5,14 11,14 10,22 19,10 13,10" fill={color} />
    </Svg>
  );
}

export function ChevronLeftIcon({ size = DEFAULTS.size, color = DEFAULTS.color, strokeWidth = DEFAULTS.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="14,4 8,12 14,20" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ChevronRightIcon({ size = DEFAULTS.size, color = DEFAULTS.color, strokeWidth = DEFAULTS.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="10,4 16,12 10,20" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function CheckIcon({ size = DEFAULTS.size, color = DEFAULTS.color, strokeWidth = DEFAULTS.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="4,13 9,18 20,6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function SearchIcon({ size = DEFAULTS.size, color = DEFAULTS.color, strokeWidth = DEFAULTS.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={10.5} cy={10.5} r={6.5} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={15.5} y1={15.5} x2={20.5} y2={20.5} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function ProgressIcon({ size = DEFAULTS.size, color = DEFAULTS.color, strokeWidth = DEFAULTS.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="3,17 9,11 13,14 21,6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Polyline points="16,6 21,6 21,11" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1={3} y1={21} x2={21} y2={21} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function UserIcon({ size = DEFAULTS.size, color = DEFAULTS.color, strokeWidth = DEFAULTS.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={strokeWidth} />
      <Path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function DownloadIcon({ size = DEFAULTS.size, color = DEFAULTS.color, strokeWidth = DEFAULTS.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1={12} y1={3} x2={12} y2={14} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Polyline points="7,10 12,15 17,10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1={5} y1={19} x2={19} y2={19} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}
