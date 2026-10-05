import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, Row, Txt } from '@/components/ui';
import { CheckIcon, ChevronRightIcon, WarningIcon } from '@/components/icons';
import { DIETS, type Diet, type DietId } from '@/data/diets';
import { makeStyles, useTheme } from '@/theme/ThemeContext';

/** Expandable list of diets: tap to read the rules, then "Избери". */
export function DietPicker({ value, onSelect, selectLabel = 'Избери този режим' }: { value: DietId; onSelect: (id: DietId) => void; selectLabel?: string }) {
  const [open, setOpen] = useState<DietId | null>(null);
  return (
    <View>
      {DIETS.map((d) => (
        <DietCard key={d.id} diet={d} selected={d.id === value} open={open === d.id} onToggle={() => setOpen(open === d.id ? null : d.id)} onSelect={() => onSelect(d.id)} selectLabel={selectLabel} />
      ))}
    </View>
  );
}

function DietCard({ diet, selected, open, onToggle, onSelect, selectLabel }: { diet: Diet; selected: boolean; open: boolean; onToggle: () => void; onSelect: () => void; selectLabel: string }) {
  const t = useTheme();
  const s = useStyles();
  return (
    <View style={[s.card, selected && { borderColor: t.c.accent, borderWidth: 2 }]}>
      <Pressable onPress={onToggle} style={s.head} hitSlop={4}>
        <View style={{ flex: 1, gap: 4 }}>
          <Row gap={8}>
            <Txt v="h3" style={{ flexShrink: 1 }}>
              {diet.name}
            </Txt>
            {selected && (
              <View style={s.current}>
                <CheckIcon size={13} color={t.c.onAccent} />
                <Txt v="caption" color={t.c.onAccent} style={{ fontWeight: '700' }}>
                  избран
                </Txt>
              </View>
            )}
          </Row>
          <Txt v="small" tone="textMuted">
            {diet.short}
          </Txt>
          {!diet.noCalories && <SplitBar diet={diet} />}
        </View>
        <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}>
          <ChevronRightIcon size={20} color={t.c.textMuted} />
        </View>
      </Pressable>

      {open && (
        <View style={{ marginTop: 12, gap: 10 }}>
          <Txt v="small">{diet.description}</Txt>
          {diet.carbCapG != null && (
            <Txt v="smallStrong" tone="carbs">
              До {diet.carbCapG} г нетни въглехидрати на ден
            </Txt>
          )}
          {diet.fastingHours != null && (
            <Txt v="smallStrong" tone="accent">
              Таймерът за пост се настройва на {diet.fastingHours} ч
            </Txt>
          )}
          <List title="✅ Яж" items={diet.eat} />
          <List title="⛔ Избягвай" items={diet.avoid} />
          <List title="💡 Съвети" items={diet.tips} />
          {diet.warning && (
            <Row gap={8} style={{ alignItems: 'flex-start', backgroundColor: t.c.warningSoft, padding: 12, borderRadius: 14 }}>
              <WarningIcon size={18} color={t.c.warning} />
              <Txt v="small" style={{ flex: 1 }}>
                {diet.warning}
              </Txt>
            </Row>
          )}
          {!selected && <Button label={selectLabel} onPress={onSelect} style={{ marginTop: 4 }} />}
        </View>
      )}
    </View>
  );
}

function SplitBar({ diet }: { diet: Diet }) {
  const t = useTheme();
  const { protein, fat, carbs } = diet.split;
  return (
    <View style={{ marginTop: 6 }}>
      <View style={{ flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: t.c.track }}>
        <View style={{ flex: protein, backgroundColor: t.c.protein }} />
        <View style={{ flex: fat, backgroundColor: t.c.fat }} />
        <View style={{ flex: Math.max(carbs, 0.001), backgroundColor: t.c.carbs }} />
      </View>
      <Txt v="caption" tone="textMuted" style={{ marginTop: 4 }}>
        Протеин {Math.round(protein * 100)}% · Мазнини {Math.round(fat * 100)}% · Въглехидрати {Math.round(carbs * 100)}%
      </Txt>
    </View>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <View style={{ gap: 3 }}>
      <Txt v="smallStrong">{title}</Txt>
      {items.map((i) => (
        <Txt key={i} v="small" tone="textMuted">
          • {i}
        </Txt>
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: { backgroundColor: t.c.surface, borderRadius: 20, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: t.dark ? 'transparent' : t.c.border },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  current: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: t.c.accent, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
}));
