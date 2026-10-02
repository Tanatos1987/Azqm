import type { HydrationTotals } from '@/types';

/** Common daily targets recommended for someone in ketosis (adjust in Settings if needed). */
export const ELECTROLYTE_TARGETS = {
  waterMl: 2500,
  sodiumMg: 4000,
  potassiumMg: 3500,
  magnesiumMg: 400,
};

export interface ElectrolyteWarning {
  key: keyof typeof ELECTROLYTE_TARGETS;
  message: string;
}

/**
 * Warn only once a reasonable share of the day has passed (so an empty morning
 * log doesn't falsely look like a deficiency), scaled by how much of a typical
 * 16-hour waking/eating window has elapsed.
 */
export function electrolyteWarnings(totals: HydrationTotals, now: Date = new Date()): ElectrolyteWarning[] {
  const hour = now.getHours() + now.getMinutes() / 60;
  const dayProgress = Math.min(Math.max(hour / 20, 0.2), 1);
  const warnings: ElectrolyteWarning[] = [];

  if (totals.waterMl < ELECTROLYTE_TARGETS.waterMl * dayProgress * 0.6) {
    warnings.push({ key: 'waterMl', message: 'Пий повече вода спрямо целта за деня.' });
  }
  if (totals.sodiumMg < ELECTROLYTE_TARGETS.sodiumMg * dayProgress * 0.5) {
    warnings.push({ key: 'sodiumMg', message: 'Ниско ниво на натрий — риск от кето грип.' });
  }
  if (totals.potassiumMg < ELECTROLYTE_TARGETS.potassiumMg * dayProgress * 0.5) {
    warnings.push({ key: 'potassiumMg', message: 'Ниско ниво на калий днес.' });
  }
  if (totals.magnesiumMg < ELECTROLYTE_TARGETS.magnesiumMg * dayProgress * 0.5) {
    warnings.push({ key: 'magnesiumMg', message: 'Ниско ниво на магнезий днес.' });
  }
  return warnings;
}
