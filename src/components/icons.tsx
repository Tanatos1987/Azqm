/**
 * Small hand-built line-icon set using react-native-svg primitives only.
 *
 * Why not @expo/vector-icons: SDK 57 no longer bundles it, and the per-family
 * `@react-native-vector-icons/*` packages pull in a conflicting react-dom peer.
 * These are drawn with the SVG primitives already used for the rings — no
 * extra native dependencies and no icon font to load.
 */
import React from 'react';
import type { ColorValue } from 'react-native';
import Svg, { Circle, Line, Path, Polygon, Polyline, Rect } from 'react-native-svg';

export interface IconProps {
  size?: number;
  color?: ColorValue;
  strokeWidth?: number;
}

const D = { size: 22, color: '#F5F6F8', strokeWidth: 1.9 };
const line = (color: ColorValue, w: number) => ({ stroke: color, strokeWidth: w, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const });

export function TodayIcon({ size = D.size, color = D.color, strokeWidth = D.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={4} y={5} width={16} height={15} rx={3} {...line(color, strokeWidth)} />
      <Line x1={4} y1={10} x2={20} y2={10} {...line(color, strokeWidth)} />
      <Line x1={8} y1={3} x2={8} y2={7} {...line(color, strokeWidth)} />
      <Line x1={16} y1={3} x2={16} y2={7} {...line(color, strokeWidth)} />
      <Rect x={9.5} y={13} width={5} height={4} rx={1} fill={color} />
    </Svg>
  );
}

export function AddIcon({ size = D.size, color = D.color, strokeWidth = D.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} {...line(color, strokeWidth)} />
      <Line x1={12} y1={8} x2={12} y2={16} {...line(color, strokeWidth)} />
      <Line x1={8} y1={12} x2={16} y2={12} {...line(color, strokeWidth)} />
    </Svg>
  );
}

export function PlusIcon({ size = D.size, color = D.color, strokeWidth = 2.4 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1={12} y1={5} x2={12} y2={19} {...line(color, strokeWidth)} />
      <Line x1={5} y1={12} x2={19} y2={12} {...line(color, strokeWidth)} />
    </Svg>
  );
}

export function MinusIcon({ size = D.size, color = D.color, strokeWidth = 2.4 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1={5} y1={12} x2={19} y2={12} {...line(color, strokeWidth)} />
    </Svg>
  );
}

export function FastingIcon({ size = D.size, color = D.color, strokeWidth = D.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={13} r={8} {...line(color, strokeWidth)} />
      <Line x1={12} y1={13} x2={12} y2={8.5} {...line(color, strokeWidth)} />
      <Line x1={12} y1={13} x2={15.5} y2={14.5} {...line(color, strokeWidth)} />
      <Line x1={9.5} y1={2.5} x2={14.5} y2={2.5} {...line(color, strokeWidth)} />
    </Svg>
  );
}

export function AnalysisIcon({ size = D.size, color = D.color, strokeWidth = D.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3a9 9 0 1 0 9 9h-9z" {...line(color, strokeWidth)} />
      <Path d="M15 3.5a9 9 0 0 1 5.5 5.5H15z" fill={color} />
    </Svg>
  );
}

export function ProgressIcon({ size = D.size, color = D.color, strokeWidth = D.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="3,17 9,11 13,14 21,6" {...line(color, strokeWidth)} />
      <Polyline points="16,6 21,6 21,11" {...line(color, strokeWidth)} />
      <Line x1={3} y1={21} x2={21} y2={21} {...line(color, strokeWidth)} />
    </Svg>
  );
}

export function SettingsIcon({ size = D.size, color = D.color, strokeWidth = D.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={3.2} {...line(color, strokeWidth)} />
      <Path
        d="M12 2.8l1.6 2.3 2.7-.6.9 2.6 2.6.9-.6 2.7 2.3 1.6-2.3 1.6.6 2.7-2.6.9-.9 2.6-2.7-.6L12 21.2l-1.6-2.3-2.7.6-.9-2.6-2.6-.9.6-2.7L2.8 12l2.3-1.6-.6-2.7 2.6-.9.9-2.6 2.7.6z"
        {...line(color, strokeWidth * 0.85)}
      />
    </Svg>
  );
}

export function CameraIcon({ size = D.size, color = D.color, strokeWidth = D.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={9} y={4} width={6} height={2.5} rx={0.6} fill={color} />
      <Rect x={3} y={6.5} width={18} height={13} rx={2.5} {...line(color, strokeWidth)} />
      <Circle cx={12} cy={13} r={4} {...line(color, strokeWidth)} />
    </Svg>
  );
}

export function BarcodeIcon({ size = D.size, color = D.color, strokeWidth = D.strokeWidth }: IconProps) {
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

export function ManualEntryIcon({ size = D.size, color = D.color, strokeWidth = D.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={4} y={5} width={16} height={14} rx={2.5} {...line(color, strokeWidth)} />
      <Line x1={7.5} y1={9.5} x2={16.5} y2={9.5} {...line(color, strokeWidth)} />
      <Line x1={7.5} y1={13} x2={14} y2={13} {...line(color, strokeWidth)} />
      <Line x1={7.5} y1={16.5} x2={11.5} y2={16.5} {...line(color, strokeWidth)} />
    </Svg>
  );
}

export function TrashIcon({ size = D.size, color = D.color, strokeWidth = D.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1={4} y1={7} x2={20} y2={7} {...line(color, strokeWidth)} />
      <Line x1={9} y1={4} x2={15} y2={4} {...line(color, strokeWidth)} />
      <Rect x={6} y={7} width={12} height={13} rx={2} {...line(color, strokeWidth)} />
      <Line x1={10} y1={10.5} x2={10} y2={16.5} {...line(color, strokeWidth)} />
      <Line x1={14} y1={10.5} x2={14} y2={16.5} {...line(color, strokeWidth)} />
    </Svg>
  );
}

export function DropletIcon({ size = D.size, color = D.color, strokeWidth = D.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3c3.5 4.4 6 7.6 6 10.8A6 6 0 0 1 6 13.8C6 10.6 8.5 7.4 12 3z" {...line(color, strokeWidth)} />
    </Svg>
  );
}

export function BoltIcon({ size = D.size, color = D.color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polygon points="13,2 5,14 11,14 10,22 19,10 13,10" fill={color} />
    </Svg>
  );
}

export function ChevronLeftIcon({ size = D.size, color = D.color, strokeWidth = 2.2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="14.5,5 8,12 14.5,19" {...line(color, strokeWidth)} />
    </Svg>
  );
}

export function ChevronRightIcon({ size = D.size, color = D.color, strokeWidth = 2.2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="9.5,5 16,12 9.5,19" {...line(color, strokeWidth)} />
    </Svg>
  );
}

export function CheckIcon({ size = D.size, color = D.color, strokeWidth = 2.4 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="4.5,12.5 9.5,17.5 19.5,6.5" {...line(color, strokeWidth)} />
    </Svg>
  );
}

export function CloseIcon({ size = D.size, color = D.color, strokeWidth = 2.2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1={6} y1={6} x2={18} y2={18} {...line(color, strokeWidth)} />
      <Line x1={18} y1={6} x2={6} y2={18} {...line(color, strokeWidth)} />
    </Svg>
  );
}

export function SearchIcon({ size = D.size, color = D.color, strokeWidth = D.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={10.5} cy={10.5} r={6.5} {...line(color, strokeWidth)} />
      <Line x1={15.5} y1={15.5} x2={20.5} y2={20.5} {...line(color, strokeWidth)} />
    </Svg>
  );
}

export function UserIcon({ size = D.size, color = D.color, strokeWidth = D.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={4} {...line(color, strokeWidth)} />
      <Path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" {...line(color, strokeWidth)} />
    </Svg>
  );
}

export function DownloadIcon({ size = D.size, color = D.color, strokeWidth = D.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1={12} y1={3} x2={12} y2={14} {...line(color, strokeWidth)} />
      <Polyline points="7,10 12,15 17,10" {...line(color, strokeWidth)} />
      <Line x1={5} y1={19} x2={19} y2={19} {...line(color, strokeWidth)} />
    </Svg>
  );
}

export function UploadIcon({ size = D.size, color = D.color, strokeWidth = D.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1={12} y1={15} x2={12} y2={4} {...line(color, strokeWidth)} />
      <Polyline points="7,8 12,3.5 17,8" {...line(color, strokeWidth)} />
      <Line x1={5} y1={19} x2={19} y2={19} {...line(color, strokeWidth)} />
    </Svg>
  );
}

export function StarIcon({ size = D.size, color = D.color, strokeWidth = D.strokeWidth, filled }: IconProps & { filled?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polygon
        points="12,3 14.7,8.8 21,9.5 16.3,13.8 17.6,20 12,16.8 6.4,20 7.7,13.8 3,9.5 9.3,8.8"
        fill={filled ? color : 'none'}
        {...line(color, strokeWidth)}
      />
    </Svg>
  );
}

export function CopyIcon({ size = D.size, color = D.color, strokeWidth = D.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={8} y={8} width={12} height={12} rx={2.5} {...line(color, strokeWidth)} />
      <Path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" {...line(color, strokeWidth)} />
    </Svg>
  );
}

export function InfoIcon({ size = D.size, color = D.color, strokeWidth = D.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} {...line(color, strokeWidth)} />
      <Line x1={12} y1={11} x2={12} y2={16.5} {...line(color, strokeWidth)} />
      <Circle cx={12} cy={7.8} r={1.1} fill={color} />
    </Svg>
  );
}

export function WarningIcon({ size = D.size, color = D.color, strokeWidth = D.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3.5 21.5 20h-19z" {...line(color, strokeWidth)} />
      <Line x1={12} y1={10} x2={12} y2={14.5} {...line(color, strokeWidth)} />
      <Circle cx={12} cy={17.2} r={1.1} fill={color} />
    </Svg>
  );
}

export function LeafIcon({ size = D.size, color = D.color, strokeWidth = D.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 19C5 10 10.5 4.5 20 4c-.5 9.5-6 15-15 15z" {...line(color, strokeWidth)} />
      <Line x1={5} y1={19} x2={13} y2={11} {...line(color, strokeWidth)} />
    </Svg>
  );
}

export function ScaleIcon({ size = D.size, color = D.color, strokeWidth = D.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3.5} y={3.5} width={17} height={17} rx={4} {...line(color, strokeWidth)} />
      <Path d="M8 9a5 5 0 0 1 8 0" {...line(color, strokeWidth)} />
      <Line x1={12} y1={9.5} x2={13.5} y2={7.5} {...line(color, strokeWidth)} />
    </Svg>
  );
}

export function FileIcon({ size = D.size, color = D.color, strokeWidth = D.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 3h8l4 4v14H6z" {...line(color, strokeWidth)} />
      <Polyline points="14,3 14,7 18,7" {...line(color, strokeWidth)} />
      <Line x1={9} y1={12} x2={15} y2={12} {...line(color, strokeWidth)} />
      <Line x1={9} y1={16} x2={15} y2={16} {...line(color, strokeWidth)} />
    </Svg>
  );
}

export function PaletteIcon({ size = D.size, color = D.color, strokeWidth = D.strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.6-.9 1.2-1.8-.5-1 .1-2.2 1.3-2.2H17a4 4 0 0 0 4-4c0-5.5-4-10-9-10z" {...line(color, strokeWidth)} />
      <Circle cx={7.5} cy={11} r={1.3} fill={color} />
      <Circle cx={10.5} cy={7} r={1.3} fill={color} />
      <Circle cx={15} cy={7.5} r={1.3} fill={color} />
    </Svg>
  );
}
