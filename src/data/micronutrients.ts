import type { MicroKey, Micronutrients, Sex } from '@/types';
import { ELECTROLYTE_TARGETS } from '@/utils/electrolytes';

export interface MicroMeta {
  key: MicroKey;
  /** column name in the food_entries table */
  column: string;
  label: string;
  unit: string;
  /** daily target by sex (adult RDA; sodium/potassium/magnesium use the keto electrolyte targets) */
  target: Record<Sex, number>;
}

export const MICRONUTRIENTS: MicroMeta[] = [
  { key: 'sodiumMg', column: 'sodium_mg', label: 'Натрий', unit: 'мг', target: { male: ELECTROLYTE_TARGETS.sodiumMg, female: ELECTROLYTE_TARGETS.sodiumMg } },
  { key: 'potassiumMg', column: 'potassium_mg', label: 'Калий', unit: 'мг', target: { male: ELECTROLYTE_TARGETS.potassiumMg, female: ELECTROLYTE_TARGETS.potassiumMg } },
  { key: 'magnesiumMg', column: 'magnesium_mg', label: 'Магнезий', unit: 'мг', target: { male: ELECTROLYTE_TARGETS.magnesiumMg, female: 320 } },
  { key: 'calciumMg', column: 'calcium_mg', label: 'Калций', unit: 'мг', target: { male: 1000, female: 1000 } },
  { key: 'ironMg', column: 'iron_mg', label: 'Желязо', unit: 'мг', target: { male: 8, female: 18 } },
  { key: 'zincMg', column: 'zinc_mg', label: 'Цинк', unit: 'мг', target: { male: 11, female: 8 } },
  { key: 'vitaminAMcg', column: 'vitamin_a_mcg', label: 'Витамин A', unit: 'мкг', target: { male: 900, female: 700 } },
  { key: 'vitaminCMg', column: 'vitamin_c_mg', label: 'Витамин C', unit: 'мг', target: { male: 90, female: 75 } },
  { key: 'vitaminDMcg', column: 'vitamin_d_mcg', label: 'Витамин D', unit: 'мкг', target: { male: 15, female: 15 } },
  { key: 'vitaminB12Mcg', column: 'vitamin_b12_mcg', label: 'Витамин B12', unit: 'мкг', target: { male: 2.4, female: 2.4 } },
];

export const EMPTY_MICROS: Micronutrients = {
  sodiumMg: 0,
  potassiumMg: 0,
  magnesiumMg: 0,
  calciumMg: 0,
  ironMg: 0,
  zincMg: 0,
  vitaminAMcg: 0,
  vitaminCMg: 0,
  vitaminDMcg: 0,
  vitaminB12Mcg: 0,
};

export function fillMicros(partial: Partial<Micronutrients> | undefined): Micronutrients {
  return { ...EMPTY_MICROS, ...partial };
}
