import React, { useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import type { Sex } from '@/types';
import { useTween } from '@/hooks/useTween';
import { useTheme } from '@/theme/ThemeContext';

const SKIN = '#F2C6A0';
const BLUSH = '#F47C7C';
const PANTS = '#334155';
const SHOES = '#1F2937';
const FACE = '#2B2118';
const HAIR: Record<Sex, string> = { male: '#3B2A20', female: '#6B3F24' };

/** BMI 16 → 0 (very slim) … BMI 40 → 1 (very heavy). */
function fatnessOf(bmi: number): number {
  return Math.max(0, Math.min((bmi - 16) / 24, 1));
}

interface BodyFigureProps {
  bmi: number;
  sex: Sex;
  /** rendered height in px; width follows the 2:3 viewBox */
  size?: number;
  /** BMI the figure starts from on first render, so it visibly morphs into `bmi` */
  fromBmi?: number;
}

/**
 * A cartoon boy/girl whose body shape is driven by BMI. Every time `bmi` changes
 * the shape tweens to the new value, and the whole figure gently "breathes".
 */
export function BodyFigure({ bmi, sex, size = 240, fromBmi }: BodyFigureProps) {
  const t = useTheme();
  const CLOTHES: Record<Sex, string> = { male: t.c.protein, female: t.c.carbs };
  const shownBmi = useTween(bmi, 1400, fromBmi);
  const f = fatnessOf(shownBmi);
  const [breath] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [breath]);

  const isMale = sex === 'male';
  const cx = 100;
  const headR = 23 + f * 3;
  const headCy = 44;
  const shoulderY = 82;
  const waistY = 134;
  const hipY = 172;
  const sh = (isMale ? 30 : 25) + f * (isMale ? 12 : 10);
  const w = (isMale ? 21 : 17) + f * 40;
  const hip = (isMale ? 24 : 30) + f * 26;
  const armW = 11 + f * 9;
  const legW = 15 + f * 17;
  const legX = hip * 0.48;
  const armOut = Math.max(sh, w) + 10;

  const torso = [
    `M ${cx - sh} ${shoulderY + 8}`,
    `Q ${cx - sh} ${shoulderY} ${cx - sh + 10} ${shoulderY}`,
    `L ${cx + sh - 10} ${shoulderY}`,
    `Q ${cx + sh} ${shoulderY} ${cx + sh} ${shoulderY + 8}`,
    `C ${cx + sh + 2} ${waistY - 28} ${cx + w} ${waistY - 22} ${cx + w} ${waistY}`,
    `C ${cx + w} ${waistY + 22} ${cx + hip} ${hipY - 18} ${cx + hip} ${hipY}`,
    `L ${cx - hip} ${hipY}`,
    `C ${cx - hip} ${hipY - 18} ${cx - w} ${waistY + 22} ${cx - w} ${waistY}`,
    `C ${cx - w} ${waistY - 22} ${cx - sh - 2} ${waistY - 28} ${cx - sh} ${shoulderY + 8}`,
    'Z',
  ].join(' ');

  const arm = (side: 1 | -1) => {
    const x0 = cx + side * (sh - 6);
    const hand = cx + side * (armOut + 4);
    return { d: `M ${x0} ${shoulderY + 8} Q ${cx + side * (armOut + 6)} ${118} ${hand} ${166}`, hand };
  };
  const arms = [arm(-1), arm(1)];

  const skirt = `M ${cx - hip + 2} ${hipY - 14} L ${cx + hip - 2} ${hipY - 14} L ${cx + hip + 14} ${212} Q ${cx} ${220} ${cx - hip - 14} ${212} Z`;
  const shorts = `M ${cx - hip} ${hipY - 12} L ${cx + hip} ${hipY - 12} L ${cx + hip} ${hipY + 12} Q ${cx} ${hipY + 20} ${cx - hip} ${hipY + 12} Z`;

  const capHair = `M ${cx - headR} ${headCy + 2} A ${headR} ${headR} 0 0 1 ${cx + headR} ${headCy + 2} Q ${cx + headR * 0.6} ${headCy - headR * 0.55} ${cx} ${headCy - headR * 0.45} Q ${cx - headR * 0.6} ${headCy - headR * 0.55} ${cx - headR} ${headCy + 2} Z`;
  const longHair = `M ${cx - headR - 5} ${headCy} A ${headR + 5} ${headR + 5} 0 0 1 ${cx + headR + 5} ${headCy} L ${cx + headR + 7} ${headCy + headR + 26} Q ${cx} ${headCy + headR + 34} ${cx - headR - 7} ${headCy + headR + 26} Z`;

  const scale = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.015] });

  return (
    <Animated.View style={{ width: (size * 2) / 3, height: size, transform: [{ scale }] }}>
      <Svg width="100%" height="100%" viewBox="0 0 200 300">
        <Ellipse cx={cx} cy={272} rx={40 + f * 30} ry={6} fill="#000" opacity={t.dark ? 0.3 : 0.12} />

        {!isMale && <Path d={longHair} fill={HAIR.female} />}

        {/* legs + feet */}
        {[-1, 1].map((side) => (
          <G key={side}>
            <Path
              d={`M ${cx + side * legX} ${hipY - 4} L ${cx + side * (legX + 2)} ${256}`}
              stroke={isMale ? PANTS : SKIN}
              strokeWidth={legW}
              strokeLinecap="round"
            />
            <Ellipse cx={cx + side * (legX + 6)} cy={264} rx={12 + f * 3} ry={6} fill={SHOES} />
          </G>
        ))}
        {isMale ? <Path d={shorts} fill={PANTS} /> : <Path d={skirt} fill={CLOTHES.female} />}

        {/* arms behind torso edges, hands in front */}
        {arms.map((a, i) => (
          <Path key={i} d={a.d} stroke={SKIN} strokeWidth={armW} strokeLinecap="round" fill="none" />
        ))}

        <Path d={torso} fill={CLOTHES[sex]} />
        {arms.map((a, i) => (
          <Circle key={i} cx={a.hand} cy={166} r={armW / 2 + 1.5} fill={SKIN} />
        ))}

        {/* neck + head */}
        <Path d={`M ${cx} ${headCy + headR - 6} L ${cx} ${shoulderY + 2}`} stroke={SKIN} strokeWidth={14 + f * 10} strokeLinecap="round" />
        <Circle cx={cx} cy={headCy} r={headR} fill={SKIN} />
        <Path d={capHair} fill={HAIR[sex]} />

        {/* face */}
        <Circle cx={cx - 8} cy={headCy} r={2.4} fill={FACE} />
        <Circle cx={cx + 8} cy={headCy} r={2.4} fill={FACE} />
        <Circle cx={cx - 14} cy={headCy + 7} r={4 + f * 2} fill={BLUSH} opacity={0.2 + f * 0.35} />
        <Circle cx={cx + 14} cy={headCy + 7} r={4 + f * 2} fill={BLUSH} opacity={0.2 + f * 0.35} />
        <Path d={`M ${cx - 7} ${headCy + 9} Q ${cx} ${headCy + 14} ${cx + 7} ${headCy + 9}`} stroke={FACE} strokeWidth={2} strokeLinecap="round" fill="none" />
      </Svg>
    </Animated.View>
  );
}
