export interface Palette {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  /** text/icon color drawn on top of `accent` */
  onAccent: string;
  accentSoft: string;
  protein: string;
  fat: string;
  carbs: string;
  fiber: string;
  water: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  warningSoft: string;
  success: string;
  info: string;
  track: string;
  overlay: string;
  shadow: string;
}

export const darkPalette: Palette = {
  bg: '#0E1116',
  surface: '#171B22',
  surfaceAlt: '#222833',
  border: '#2C3340',
  text: '#F3F5F8',
  textMuted: '#B0B8C6',
  textFaint: '#7D8696',
  accent: '#3DDC84',
  onAccent: '#05210F',
  accentSoft: 'rgba(61,220,132,0.15)',
  protein: '#5B9DFF',
  fat: '#FFB020',
  carbs: '#FF6FAE',
  fiber: '#A594FF',
  water: '#38BDF8',
  danger: '#FF6B6B',
  dangerSoft: 'rgba(255,107,107,0.15)',
  warning: '#FFC145',
  warningSoft: 'rgba(255,193,69,0.15)',
  success: '#34D399',
  info: '#60A5FA',
  track: '#2C3340',
  overlay: 'rgba(0,0,0,0.6)',
  shadow: '#000000',
};

export const lightPalette: Palette = {
  bg: '#F3F5F8',
  surface: '#FFFFFF',
  surfaceAlt: '#EBEEF3',
  border: '#DCE1E8',
  text: '#121720',
  textMuted: '#4A5363',
  textFaint: '#7C8596',
  accent: '#15A04A',
  onAccent: '#FFFFFF',
  accentSoft: 'rgba(21,160,74,0.12)',
  protein: '#2563EB',
  fat: '#D97706',
  carbs: '#DB2777',
  fiber: '#7C3AED',
  water: '#0284C7',
  danger: '#DC2626',
  dangerSoft: 'rgba(220,38,38,0.1)',
  warning: '#B45309',
  warningSoft: 'rgba(217,119,6,0.12)',
  success: '#059669',
  info: '#2563EB',
  track: '#E2E6EC',
  overlay: 'rgba(15,20,30,0.45)',
  shadow: '#1B2433',
};
