/**
 * Why to donate and what Pro gives — shown by the support wizard, the support screen and Help.
 * Functions, not constants, so the texts follow a language switch.
 */
import { SUPPORT_SKUS } from '@/context/ProContext';
import { tr } from '@/i18n';

/** Our own names for the three amounts (Play product id → emoji and name); the prices come from Google Play. */
export function supportTiers(): Record<string, { emoji: string; name: string }> {
  return {
    [SUPPORT_SKUS[0]]: { emoji: '☕', name: tr('Кафе', 'A coffee') },
    [SUPPORT_SKUS[1]]: { emoji: '🥗', name: tr('Обяд', 'A lunch') },
    [SUPPORT_SKUS[2]]: { emoji: '💚', name: tr('Голяма благодарност', 'A big thank you') },
  };
}

export interface Perk {
  emoji: string;
  title: string;
  text: string;
}

/** What a donation does for the app (and for everyone using it). */
export function donationBenefits(): Perk[] {
  return [
    {
      emoji: '🚫',
      title: tr('Без реклами — завинаги', 'No ads — ever'),
      text: tr('Даренията заместват рекламите, затова в Azqm няма и няма да има реклами.', 'Donations replace ads, so Azqm has no ads and never will.'),
    },
    {
      emoji: '🔒',
      title: tr('Данните ти остават твои', 'Your data stays yours'),
      text: tr('Без регистрация и без продажба на данни — всичко остава на телефона ти.', 'No sign-up and no selling of data — everything stays on your phone.'),
    },
    {
      emoji: '🛠️',
      title: tr('Нови функции и поправки', 'New features and fixes'),
      text: tr('Подкрепата покрива времето за разработка, преводи и поддръжка.', 'Your support pays for the time that goes into development, translations and upkeep.'),
    },
    {
      emoji: '💚',
      title: tr('Безплатно за всички', 'Free for everyone'),
      text: tr('Дарението ти държи Azqm безплатно и за хората, които не могат да платят.', 'Your donation keeps Azqm free for people who can’t pay.'),
    },
  ];
}

/** Each Pro feature, also listed in Help. */
export const PRO_FEATURES = {
  photos: (): Perk => ({
    emoji: '📸',
    title: tr('Снимки за прогрес', 'Progress photos'),
    text: tr('Отпред, отстрани и отзад, с контур от предишната снимка и самоснимачка.', 'Front, side and back, with an outline of your previous photo and a self-timer.'),
  }),
  compare: (): Perk => ({
    emoji: '↔️',
    title: tr('Сравнение преди и след', 'Before and after'),
    text: tr('Плъзгач върху две снимки, с датите и теглото.', 'A slider across two photos, with the dates and your weight.'),
  }),
  measurements: (): Perk => ({
    emoji: '📏',
    title: tr('Обиколки и % мазнини', 'Measurements and body fat'),
    text: tr('Талия, ханш и още с графики, плюс % телесни мазнини.', 'Waist, hips and more with charts, plus body fat %.'),
  }),
  trend: (): Perk => ({
    emoji: '📉',
    title: tr('Тренд и прогноза', 'Trend and forecast'),
    text: tr('Изгладено тегло, темп на седмица и кога ще стигнеш целта.', 'Smoothed weight, weekly pace and when you’ll reach your goal.'),
  }),
  recipes: (): Perk => ({
    emoji: '🍲',
    title: tr('Мои ястия', 'My dishes'),
    text: tr('Ястие от продукти с грамажи и порции — добавяш порция с едно докосване.', 'A dish built from foods with amounts and servings — log a serving with one tap.'),
  }),
  reminders: (): Perk => ({
    emoji: '🔔',
    title: tr('Напомняния', 'Reminders'),
    text: tr('Претегляне, вода, записване на храната и край на поста.', 'Weigh-in, water, logging food and the end of a fast.'),
  }),
};

/** What the donor gets: Azqm Pro, for good. */
export function proPerks(): Perk[] {
  return [
    PRO_FEATURES.photos(),
    PRO_FEATURES.compare(),
    PRO_FEATURES.measurements(),
    PRO_FEATURES.trend(),
    PRO_FEATURES.recipes(),
    PRO_FEATURES.reminders(),
    {
      emoji: '📱',
      title: tr('На всички твои телефони', 'On all your phones'),
      text: tr('Pro важи за всеки телефон с този Google акаунт.', 'Pro works on every phone with this Google account.'),
    },
    {
      emoji: '✨',
      title: tr('Бъдещите Pro функции', 'Future Pro features'),
      text: tr('Без абонамент и без доплащане.', 'No subscription, nothing more to pay.'),
    },
  ];
}
