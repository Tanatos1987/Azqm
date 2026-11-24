import React from 'react';
import type { LucideIcon } from 'lucide-react-native';
// One file per icon, so only these end up in the app (the package has 2 000+).
import Apple from 'lucide-react-native/icons/apple';
import Bean from 'lucide-react-native/icons/bean';
import Beef from 'lucide-react-native/icons/beef';
import Candy from 'lucide-react-native/icons/candy';
import Carrot from 'lucide-react-native/icons/carrot';
import Cheese from 'lucide-react-native/icons/cheese';
import Clock from 'lucide-react-native/icons/clock';
import Coffee from 'lucide-react-native/icons/coffee';
import Droplet from 'lucide-react-native/icons/droplet';
import Droplets from 'lucide-react-native/icons/droplets';
import Egg from 'lucide-react-native/icons/egg';
import Fish from 'lucide-react-native/icons/fish';
import Ham from 'lucide-react-native/icons/ham';
import Milk from 'lucide-react-native/icons/milk';
import Moon from 'lucide-react-native/icons/moon';
import Nut from 'lucide-react-native/icons/nut';
import Search from 'lucide-react-native/icons/search';
import Soup from 'lucide-react-native/icons/soup';
import Star from 'lucide-react-native/icons/star';
import Sun from 'lucide-react-native/icons/sun';
import Sunrise from 'lucide-react-native/icons/sunrise';
import Utensils from 'lucide-react-native/icons/utensils';
import Wheat from 'lucide-react-native/icons/wheat';
import Wine from 'lucide-react-native/icons/wine';
import type { MealType } from '@/types';
import { MEAL_ICON, categoryIconKey } from '@/data/foodIcons';

/**
 * Thin line icons in place of emoji (owner's pick, 24.11.2026: option А). The keys are what the data tables use
 * (src/data/foodIcons.ts); every key has its drawing here.
 */
const ICONS = {
  apple: Apple,
  bean: Bean,
  beef: Beef,
  candy: Candy,
  carrot: Carrot,
  cheese: Cheese,
  clock: Clock,
  coffee: Coffee,
  droplet: Droplet,
  droplets: Droplets,
  egg: Egg,
  fish: Fish,
  ham: Ham,
  milk: Milk,
  moon: Moon,
  nut: Nut,
  search: Search,
  soup: Soup,
  star: Star,
  sun: Sun,
  sunrise: Sunrise,
  utensils: Utensils,
  wheat: Wheat,
  wine: Wine,
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
