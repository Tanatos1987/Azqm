/**
 * What each button does, in one place: the first-run tour (src/context/TourContext.tsx) points at the buttons with
 * these texts and the Help screen lists them all. Functions, not constants, so the texts follow a language switch.
 */
import { tr } from '@/i18n';
import { donationBenefits, PRO_FEATURES, type Perk } from './pro';

/** Buttons the tour can point at; each is wrapped in <TourTarget id="…">. */
export type TourTargetId =
  | 'today-summary'
  | 'today-diet'
  | 'today-date'
  | 'today-tiles'
  | 'today-add'
  | 'today-settings'
  | 'today-help'
  | 'tab-add'
  | 'tab-analysis'
  | 'tab-progress'
  | 'tab-fasting'
  | 'tab-pro';

export interface TourStep {
  /** No target: a centred card (the welcome step). */
  target?: TourTargetId;
  /** The target sits in the Today screen's scroll view and may need scrolling into view. */
  scroll?: boolean;
  title: string;
  text: string;
}

const today = {
  summary: () => ({
    emoji: '📊',
    title: tr('Обобщение на деня', 'Your day at a glance'),
    text: tr('Изядени и оставащи калории, плюс протеин, мазнини и въглехидрати спрямо целите ти.', 'Calories eaten and left, plus protein, fat and carbs against your goals.'),
  }),
  diet: () => ({
    emoji: '🥗',
    title: tr('Хранителен режим', 'Diet'),
    text: tr('Докосни, за да смениш режима — целите се преизчисляват сами.', 'Tap to switch diets — your goals are recalculated automatically.'),
  }),
  date: () => ({
    emoji: '📅',
    title: tr('Смяна на деня', 'Switch days'),
    text: tr('◀ ▶ отиват на предишния и следващия ден, а докосване на датата те връща на днес.', '◀ ▶ go to the previous and next day; tap the date to jump back to today.'),
  }),
  tiles: () => ({
    emoji: '💧',
    title: tr('Вода, пост и средно за 7 дни', 'Water, fasting and 7-day average'),
    text: tr('„+ 250 мл“ добавя чаша вода. Докосни поста или средното, за да отвориш раздела им.', '“+ 250 ml” logs a glass of water. Tap the fast or the average to open its tab.'),
  }),
  add: () => ({
    emoji: '➕',
    title: tr('Добави храна', 'Add food'),
    text: tr(
      'Добавя храна в дневника. Докосни запис от списъка, за да промениш грамажа, да го повториш или изтриеш.',
      'Adds food to your diary. Tap an entry in the list to change the amount, log it again or delete it.'
    ),
  }),
  settings: () => ({
    emoji: '⚙️',
    title: tr('Настройки', 'Settings'),
    text: tr('Профил и цели, език, тема и размер на текста, експорт в Excel и резервно копие.', 'Profile and goals, language, theme and text size, Excel export and backups.'),
  }),
};

const tabs = {
  add: () => ({
    emoji: '🔎',
    title: tr('Добави', 'Add'),
    text: tr('Търси сред над 1000 храни, сканирай баркод, снимай чинията или въведи храна ръчно.', 'Search 1000+ foods, scan a barcode, photograph your plate or enter food by hand.'),
  }),
  analysis: () => ({
    emoji: '📈',
    title: tr('Анализ', 'Analysis'),
    text: tr('Средни стойности за 7, 30 и 90 дни, витамини и минерали и какво ти липсва.', 'Averages over 7, 30 and 90 days, vitamins and minerals, and what you’re missing.'),
  }),
  progress: () => ({
    emoji: '⚖️',
    title: tr('Прогрес', 'Progress'),
    text: tr('Тегло и индекс на телесна маса с графика, плюс тренд, обиколки и снимки (Pro).', 'Weight and body mass index with a chart, plus trend, measurements and photos (Pro).'),
  }),
  fasting: () => ({
    emoji: '⏱️',
    title: tr('Пост', 'Fasting'),
    text: tr(
      'Таймер за интервално хранене и гладуване: цел в часове, етапите в тялото и история.',
      'A timer for intermittent and extended fasting: a goal in hours, what happens in your body, and a history.'
    ),
  }),
  pro: () => ({
    emoji: '💚',
    title: tr('Подкрепи', 'Support'),
    text: tr('Еднократно дарение по избор отключва Pro завинаги. След това разделът изчезва.', 'A one-time donation of your choice unlocks Pro for good. After that, this tab disappears.'),
  }),
};

const help = () => ({
  emoji: '❓',
  title: tr('Помощ', 'Help'),
  text: tr('Тук е обяснено всичко в приложението. Оттук можеш да пуснеш обиколката отново.', 'Everything in the app is explained here. You can replay this tour from here.'),
});

/** The tour, in order. Steps whose button isn't on screen (e.g. the Support tab for Pro users) are skipped. */
export function tourSteps(isPro: boolean): TourStep[] {
  const steps: TourStep[] = [
    {
      title: tr('Добре дошли в Azqm 👋', 'Welcome to Azqm 👋'),
      text: tr('Ще ти покажа за какво е всеки бутон. Отнема под минута.', 'Let me show you what each button does. It takes less than a minute.'),
    },
    { target: 'today-summary', scroll: true, ...today.summary() },
    { target: 'today-diet', scroll: true, ...today.diet() },
    { target: 'today-date', ...today.date() },
    { target: 'today-tiles', scroll: true, ...today.tiles() },
    { target: 'today-add', scroll: true, ...today.add() },
    { target: 'today-settings', ...today.settings() },
    { target: 'tab-add', ...tabs.add() },
    { target: 'tab-analysis', ...tabs.analysis() },
    { target: 'tab-progress', ...tabs.progress() },
    { target: 'tab-fasting', ...tabs.fasting() },
    ...(isPro ? [] : [{ target: 'tab-pro' as const, ...tabs.pro() }]),
    { target: 'today-help', scroll: true, ...help() },
  ];
  return steps;
}

export interface HelpSection {
  /** Also the `section` param of /help that scrolls to it. */
  key: 'today' | 'add' | 'analysis' | 'progress' | 'fasting' | 'settings' | 'support';
  title: string;
  items: Perk[];
}

export function helpSections(): HelpSection[] {
  return [
    {
      key: 'today',
      title: tr('Днес', 'Today'),
      items: [
        today.summary(),
        today.diet(),
        today.date(),
        today.tiles(),
        today.add(),
        {
          emoji: '📋',
          title: tr('Копирай предишния ден', 'Copy the previous day'),
          text: tr('Когато денят е празен, един бутон добавя храните от предишния ден.', 'When a day is empty, one button adds the foods from the previous day.'),
        },
      ],
    },
    {
      key: 'add',
      title: tr('Добави', 'Add'),
      items: [
        {
          emoji: '🔎',
          title: tr('Търси', 'Search'),
          text: tr(
            'Търси по име; „Подходящи“, „Последни“ и „Любими“ са бързи списъци за режима ти.',
            'Search by name; “Suitable”, “Recent” and “Favorites” are quick lists for your diet.'
          ),
        },
        {
          emoji: '🏷️',
          title: tr('Баркод', 'Barcode'),
          text: tr(
            'Сканирай баркода на опаковката — данните идват от Open Food Facts (нужен е интернет).',
            'Scan the barcode on the package — the data comes from Open Food Facts (internet needed).'
          ),
        },
        {
          emoji: '📷',
          title: tr('Снимка', 'Photo'),
          text: tr(
            'Снимай чинията и изкуственият интелект разпознава храната. Нужен е твой ключ за Gemini или OpenAI в Настройки.',
            'Photograph your plate and AI recognises the food. Needs your own Gemini or OpenAI key in Settings.'
          ),
        },
        {
          emoji: '✍️',
          title: tr('Ръчно', 'Manual'),
          text: tr(
            'Въведи стойностите за 100 г сам и запази храната в „Мои храни“ за следващия път.',
            'Enter the values per 100 g yourself and save the food to “My foods” for next time.'
          ),
        },
        PRO_FEATURES.recipes(),
      ],
    },
    { key: 'analysis', title: tr('Анализ', 'Analysis'), items: [tabs.analysis()] },
    {
      key: 'progress',
      title: tr('Прогрес', 'Progress'),
      items: [
        { ...tabs.progress(), title: tr('Тегло', 'Weight') },
        PRO_FEATURES.trend(),
        PRO_FEATURES.measurements(),
        PRO_FEATURES.photos(),
        PRO_FEATURES.compare(),
      ],
    },
    { key: 'fasting', title: tr('Пост', 'Fasting'), items: [tabs.fasting()] },
    {
      key: 'settings',
      title: tr('Настройки', 'Settings'),
      items: [
        {
          emoji: '👤',
          title: tr('Профил и режим', 'Profile and diet'),
          text: tr(
            'Пол, възраст, ръст, тегло, активност и цел — от тях се смятат калориите ти.',
            'Sex, age, height, weight, activity and goal — your calories are worked out from them.'
          ),
        },
        {
          emoji: '🎨',
          title: tr('Изглед', 'Appearance'),
          text: tr('Тъмна или светла тема, размер на текста и език.', 'Dark or light theme, text size and language.'),
        },
        {
          emoji: '💾',
          title: tr('Данни', 'Data'),
          text: tr(
            'Експорт на дневника в Excel или CSV и резервно копие, което възстановяваш на нов телефон.',
            'Export your diary to Excel or CSV, and a backup you can restore on a new phone.'
          ),
        },
        PRO_FEATURES.reminders(),
      ],
    },
    { key: 'support', title: tr('Подкрепи Azqm', 'Support Azqm'), items: donationBenefits() },
  ];
}
