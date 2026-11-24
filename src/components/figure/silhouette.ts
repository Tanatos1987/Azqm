import type { Sex } from '@/types';

/**
 * The realistic body that replaced the cartoon boy/girl (owner, 24.11.2026: "away from the childish
 * design"). Front view, no face and no clothes, real proportions; the outline goes through contour
 * points that depend on BMI and sex, smoothed with a Catmull-Rom spline. The figure box is 200 × 440
 * (head on top, feet at y ≈ 432), centred on x = 100.
 */

export interface FigureShape {
  body: string;
  armL: string;
  armR: string;
  head: { cx: number; cy: number; rx: number; ry: number };
}

const CX = 100;

/** BMI 16 → 0 (very slim) … BMI 40 → 1 (very heavy). */
export function fatnessOf(bmi: number): number {
  return Math.max(0, Math.min((bmi - 16) / 24, 1));
}

/** Left half of the body outline as [distance from the centre, y], neck down to the crotch. */
function bodyPoints(f: number, s: number): [number, number][] {
  return [
    [8 + 3 * f, 56],
    [9 + 4 * f, 66],
    [22 + 6 * f + 3 * s, 73],
    [34 + 5 * s + 8 * f, 82],
    [36 + 6 * s + 10 * f, 92],
    [31 + 4 * s + 10 * f, 112],
    [31 + 3 * s + 14 * f, 132],
    [25 + 4 * s + 24 * f, 162], // waist
    [27 + 3 * s + 30 * f, 184], // belly
    [35 - 2 * s + 22 * f, 208], // hips
    [33 - 1 * s + 22 * f, 232],
    [25 + 10 * f, 290],
    [21 + 6 * f, 312],
    [22 + 7 * f, 345],
    [13 + 3 * f, 400],
    [16 + 3 * f, 424],
    [10, 432],
    [4, 432],
    [5, 404],
    [6 + 2 * f, 350],
    [5 + 3 * f, 312],
    [3 + 4 * f, 270],
    [2 + 1 * f, 236],
  ];
}

/** Left arm outline: outer edge down to the fingers, inner edge back up. Fat pushes the arms out. */
function armPoints(f: number, s: number): [number, number][] {
  const o = 18 * f;
  return [
    [36 + 6 * s + 10 * f, 88],
    [40 + 6 * s + o + 4 * f, 120],
    [41 + 5 * s + o + 3 * f, 165],
    [42 + 5 * s + o + 2 * f, 210],
    [43 + 5 * s + o + 2 * f, 236],
    [39 + 5 * s + o, 252],
    [33 + 5 * s + o, 248],
    [33 + 5 * s + o, 232],
    [32 + 4 * s + o, 190],
    [31 + 4 * s + o, 160],
    [29 + 4 * s + o * 0.7, 120],
  ];
}

/** Closed smooth path through [x, y] points (Catmull-Rom converted to cubic Béziers). */
function smooth(pts: [number, number][]): string {
  const n = pts.length;
  const f = (v: number) => v.toFixed(1);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return `${d} Z`;
}

/** Half-widths of the figure at the shoulders, the waist and the hips (figure units). */
export function measures(bmi: number, sex: Sex): { shoulder: number; waist: number; hip: number } {
  const p = bodyPoints(fatnessOf(bmi), sex === 'male' ? 1 : 0);
  return { shoulder: p[3][0], waist: p[7][0], hip: p[9][0] };
}

export function silhouette(bmi: number, sex: Sex): FigureShape {
  const f = fatnessOf(bmi);
  const s = sex === 'male' ? 1 : 0;
  const left = bodyPoints(f, s);
  const body: [number, number][] = [
    ...left.map(([dx, y]) => [CX - dx, y] as [number, number]),
    [CX, 230],
    ...left
      .slice()
      .reverse()
      .map(([dx, y]) => [CX + dx, y] as [number, number]),
  ];
  const arm = armPoints(f, s);
  return {
    body: smooth(body),
    armL: smooth(arm.map(([dx, y]) => [CX - dx, y] as [number, number])),
    armR: smooth(arm.map(([dx, y]) => [CX + dx, y] as [number, number]).reverse()),
    head: { cx: CX, cy: 34, rx: 16 + 2.5 * f + s, ry: 21 + 1.5 * f },
  };
}
