/** Body measurements (Pro): which ones, their names and how to take them. Functions so they follow the language. */
import type { MeasureKey } from '@/types';
import { tr } from '@/i18n';

export const MEASURE_KEYS: readonly MeasureKey[] = ['waist', 'hips', 'chest', 'arm', 'thigh', 'neck'];

export function measureLabel(key: MeasureKey): string {
  return {
    waist: tr('Талия', 'Waist'),
    hips: tr('Ханш', 'Hips'),
    chest: tr('Гърди', 'Chest'),
    arm: tr('Ръка', 'Arm'),
    thigh: tr('Бедро', 'Thigh'),
    neck: tr('Врат', 'Neck'),
  }[key];
}

/** The Pro teaser of the measurements (Progress tab and the locked screen). */
export function measurementsTeaser(): string {
  return tr(
    'Талия, ханш, гърди, ръка, бедро и врат с графики, плюс % телесни мазнини по метода на американския флот.',
    'Waist, hips, chest, arm, thigh and neck with charts, plus body fat % by the US Navy method.'
  );
}

export function measureHint(key: MeasureKey): string {
  return {
    waist: tr('На нивото на пъпа, без да прибираш корема.', 'At navel level, without pulling your stomach in.'),
    hips: tr('Около най-широката част на седалището.', 'Around the widest part of your bottom.'),
    chest: tr('През зърната, под мишниците.', 'Across the nipples, under the armpits.'),
    arm: tr('Най-широката част на отпуснатата ръка.', 'The widest part of your relaxed upper arm.'),
    thigh: tr('Най-широката част, точно под седалището.', 'The widest part, just below your bottom.'),
    neck: tr('Точно под адамовата ябълка.', 'Just below the Adam’s apple.'),
  }[key];
}
