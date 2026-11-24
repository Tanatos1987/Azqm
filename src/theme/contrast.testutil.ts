/** WCAG helpers for tests: relative luminance of #RRGGBB (or an [r, g, b] triple) and the contrast of two of them. */
export function luminance(c: string | [number, number, number]): number {
  const rgb = typeof c === 'string' ? [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) : c;
  const [r, g, b] = rgb.map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: number, b: number): number {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
