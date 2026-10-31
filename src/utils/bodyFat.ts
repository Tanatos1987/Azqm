/**
 * Body fat estimate from a tape measure (Pro): the US Navy method (Hodgdon & Beckett, 1984) — height, waist and neck,
 * and the hips for women, all in cm. It is an estimate, usually within a few percent of a DEXA scan.
 */
import type { MeasureKey, Sex } from '@/types';
import type { BmiTone } from './bodyMetrics';
import { tr } from '@/i18n';

/** Body fat in %, or null when a needed measurement is missing or the numbers can't be right. */
export function navyBodyFat(sex: Sex, heightCm: number, m: Partial<Record<MeasureKey, number>>): number | null {
  const { waist, neck, hips } = m;
  if (!waist || !neck || !(heightCm > 0)) return null;
  let bf: number;
  if (sex === 'male') {
    if (waist - neck <= 0) return null;
    bf = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(heightCm)) - 450;
  } else {
    if (!hips || waist + hips - neck <= 0) return null;
    bf = 495 / (1.29579 - 0.35004 * Math.log10(waist + hips - neck) + 0.221 * Math.log10(heightCm)) - 450;
  }
  return bf > 2 && bf < 70 ? bf : null;
}

/** American Council on Exercise ranges. */
export function bodyFatCategory(sex: Sex, bf: number): { label: string; tone: BmiTone } {
  const [essential, athletes, fitness, average] = sex === 'male' ? [6, 14, 18, 25] : [14, 21, 25, 32];
  if (bf < essential) return { label: tr('Много ниско', 'Very low'), tone: 'warning' };
  if (bf < athletes) return { label: tr('Атлетично', 'Athletic'), tone: 'success' };
  if (bf < fitness) return { label: tr('Във форма', 'Fit'), tone: 'success' };
  // "Typical", not "Average": the catalogs translate "Average" as "on average".
  if (bf < average) return { label: tr('Обичайно', 'Typical'), tone: 'info' };
  return { label: tr('Високо', 'High'), tone: 'danger' };
}
