import React from 'react';
import type { LucideIcon } from 'lucide-react-native';
// One file per icon, so only these end up in the app (the package has 2 000+).
import Apple from 'lucide-react-native/icons/apple';
import ArrowLeftRight from 'lucide-react-native/icons/arrow-left-right';
import Ban from 'lucide-react-native/icons/ban';
import Bean from 'lucide-react-native/icons/bean';
import Beef from 'lucide-react-native/icons/beef';
import Bell from 'lucide-react-native/icons/bell';
import Calendar from 'lucide-react-native/icons/calendar';
import Camera from 'lucide-react-native/icons/camera';
import Candy from 'lucide-react-native/icons/candy';
import Carrot from 'lucide-react-native/icons/carrot';
import ChartLine from 'lucide-react-native/icons/chart-line';
import ChartPie from 'lucide-react-native/icons/chart-pie';
import Cheese from 'lucide-react-native/icons/cheese';
import CircleHelp from 'lucide-react-native/icons/circle-help';
import Clock from 'lucide-react-native/icons/clock';
import Coffee from 'lucide-react-native/icons/coffee';
import Copy from 'lucide-react-native/icons/copy';
import Database from 'lucide-react-native/icons/database';
import Droplet from 'lucide-react-native/icons/droplet';
import Droplets from 'lucide-react-native/icons/droplets';
import Egg from 'lucide-react-native/icons/egg';
import Fish from 'lucide-react-native/icons/fish';
import Ham from 'lucide-react-native/icons/ham';
import Heart from 'lucide-react-native/icons/heart';
import Lock from 'lucide-react-native/icons/lock';
import Milk from 'lucide-react-native/icons/milk';
import Moon from 'lucide-react-native/icons/moon';
import Nut from 'lucide-react-native/icons/nut';
import Palette from 'lucide-react-native/icons/palette';
import Pencil from 'lucide-react-native/icons/pencil';
import Plus from 'lucide-react-native/icons/plus';
import Ruler from 'lucide-react-native/icons/ruler';
import Salad from 'lucide-react-native/icons/salad';
import ScanBarcode from 'lucide-react-native/icons/scan-barcode';
import Search from 'lucide-react-native/icons/search';
import Settings from 'lucide-react-native/icons/settings';
import Smartphone from 'lucide-react-native/icons/smartphone';
import Soup from 'lucide-react-native/icons/soup';
import Sparkles from 'lucide-react-native/icons/sparkles';
import Star from 'lucide-react-native/icons/star';
import Sun from 'lucide-react-native/icons/sun';
import Sunrise from 'lucide-react-native/icons/sunrise';
import Timer from 'lucide-react-native/icons/timer';
import TrendingDown from 'lucide-react-native/icons/trending-down';
import User from 'lucide-react-native/icons/user';
import Utensils from 'lucide-react-native/icons/utensils';
import Weight from 'lucide-react-native/icons/weight';
import Wheat from 'lucide-react-native/icons/wheat';
import Wine from 'lucide-react-native/icons/wine';
import Wrench from 'lucide-react-native/icons/wrench';
import type { MealType } from '@/types';
import { MEAL_ICON, categoryIconKey } from '@/data/foodIcons';

/**
 * Thin line icons in place of emoji (owner's pick, 24.11.2026: option А): foods and meals (src/data/foodIcons.ts),
 * empty states, Pro cards, reminders, Help and Support. Every key has its drawing here.
 */
const ICONS = {
  apple: Apple,
  'arrow-left-right': ArrowLeftRight,
  ban: Ban,
  bean: Bean,
  beef: Beef,
  bell: Bell,
  calendar: Calendar,
  camera: Camera,
  candy: Candy,
  carrot: Carrot,
  'chart-line': ChartLine,
  'chart-pie': ChartPie,
  cheese: Cheese,
  'circle-help': CircleHelp,
  clock: Clock,
  coffee: Coffee,
  copy: Copy,
  database: Database,
  droplet: Droplet,
  droplets: Droplets,
  egg: Egg,
  fish: Fish,
  ham: Ham,
  heart: Heart,
  lock: Lock,
  milk: Milk,
  moon: Moon,
  nut: Nut,
  palette: Palette,
  pencil: Pencil,
  plus: Plus,
  ruler: Ruler,
  salad: Salad,
  'scan-barcode': ScanBarcode,
  search: Search,
  settings: Settings,
  smartphone: Smartphone,
  soup: Soup,
  sparkles: Sparkles,
  star: Star,
  sun: Sun,
  sunrise: Sunrise,
  timer: Timer,
  'trending-down': TrendingDown,
  user: User,
  utensils: Utensils,
  weight: Weight,
  wheat: Wheat,
  wine: Wine,
  wrench: Wrench,
} satisfies Record<string, LucideIcon>;

export type IconKey = keyof typeof ICONS;

export function LineIcon({ name, size = 22, color }: { name: IconKey; size?: number; color: string }) {
  const Icon = ICONS[name];
  return <Icon size={size} color={color} strokeWidth={1.75} />;
}

export function CategoryIcon({ category, size, color }: { category: string; size?: number; color: string }) {
  return <LineIcon name={categoryIconKey(category)} size={size} color={color} />;
}

export function MealIcon({ meal, size, color }: { meal: MealType; size?: number; color: string }) {
  return <LineIcon name={MEAL_ICON[meal]} size={size} color={color} />;
}
