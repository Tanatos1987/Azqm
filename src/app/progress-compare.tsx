import React, { useEffect, useMemo, useState } from 'react';
import { Image, PanResponder, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Card, EmptyState, IconButton, Row, Screen, SectionHeader, Segmented, Txt } from '@/components/ui';
import { ChevronLeftIcon } from '@/components/icons';
import { ProLock } from '@/components/ProLock';
import { usePro } from '@/context/ProContext';
import { useDataRefresh } from '@/context/DataRefreshContext';
import { getProgressPhotos, getWeightEntries } from '@/db/queries';
import { useTheme } from '@/theme/ThemeContext';
import type { PhotoPose, ProgressPhoto, WeightEntry } from '@/types';
import { POSES, photoUri, poseLabel, weightOn } from '@/utils/progressPhotos';
import { daysBetween, formatDateLabel, formatNumber } from '@/utils/date';
import { useI18n } from '@/i18n';

type Mode = 'slider' | 'side';

export default function ProgressCompareScreen() {
  const t = useTheme();
  const { tr } = useI18n();
  const { isPro } = usePro();
  const db = useSQLiteContext();
  const { version } = useDataRefresh();
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [pose, setPose] = useState<PhotoPose | null>(null);
  const [beforeId, setBeforeId] = useState<number | null>(null);
  const [afterId, setAfterId] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>('slider');

  useEffect(() => {
    Promise.all([getProgressPhotos(db), getWeightEntries(db)]).then(([p, w]) => {
      setPhotos(p);
      setWeights(w);
    });
  }, [db, version]);

  const poses = useMemo(() => POSES.filter((p) => photos.some((x) => x.pose === p)), [photos]);
  const current = pose && poses.includes(pose) ? pose : (poses[0] ?? null);
  const ofPose = useMemo(() => photos.filter((p) => p.pose === current), [photos, current]);
  // Defaults: the first and the latest photo of the pose.
  const before = ofPose.find((p) => p.id === beforeId) ?? ofPose[0];
  const after = ofPose.find((p) => p.id === afterId) ?? ofPose[ofPose.length - 1];

  const back = (
    <IconButton onPress={() => router.back()} accessibilityLabel={tr('Назад', 'Back')}>
      <ChevronLeftIcon size={24} color={t.c.text} />
    </IconButton>
  );

  if (!isPro) {
    return (
      <Screen title={tr('Сравнение', 'Compare')} left={back} scroll>
        <ProLock emoji="↔️" title={tr('Сравнение преди и след', 'Before and after')} text={tr('Плъзгач върху две снимки, с датите и теглото.', 'A slider across two photos, with the dates and your weight.')} />
      </Screen>
    );
  }

  const choosePose = (p: PhotoPose) => {
    setPose(p);
    setBeforeId(null);
    setAfterId(null);
  };

  const kgBefore = before ? weightOn(weights, before.date) : null;
  const kgAfter = after ? weightOn(weights, after.date) : null;
  const days = before && after ? daysBetween(before.date, after.date) : 0;
  const diff = kgBefore != null && kgAfter != null ? kgAfter - kgBefore : null;

  return (
    <Screen title={tr('Сравнение', 'Compare')} left={back} scroll>
      {ofPose.length < 2 || !before || !after ? (
        <EmptyState emoji="↔️" title={tr('Нужни са поне две снимки', 'You need at least two photos')} text={tr('Снимай се от една и съща поза в различни дни, за да ги сравниш.', 'Take photos of the same pose on different days to compare them.')} />
      ) : (
        <>
          {poses.length > 1 ? <Segmented<PhotoPose> value={current!} onChange={choosePose} options={poses.map((p) => ({ label: poseLabel(p), value: p }))} style={{ marginBottom: 10 }} /> : null}
          <Segmented<Mode>
            value={mode}
            onChange={setMode}
            options={[
              { label: tr('Плъзгач', 'Slider'), value: 'slider' },
              { label: tr('Една до друга', 'Side by side'), value: 'side' },
            ]}
            style={{ marginBottom: 12 }}
          />
          {mode === 'slider' ? (
            <BeforeAfter before={before} after={after} />
          ) : (
            <Row gap={8}>
              {[before, after].map((p, i) => (
                <View key={i} style={[styles.side, { backgroundColor: t.c.surfaceAlt }]}>
                  <Image source={{ uri: photoUri(p.file) }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  <Tag text={i === 0 ? tr('Преди', 'Before') : tr('След', 'After')} />
                </View>
              ))}
            </Row>
          )}

          <Card style={{ marginTop: 12 }}>
            <Row gap={8}>
              <Stat label={tr('Преди', 'Before')} date={before.date} kg={kgBefore} />
              <Stat label={tr('След', 'After')} date={after.date} kg={kgAfter} />
            </Row>
            <Txt v="bodyStrong" center style={{ marginTop: 10 }} tone={diff == null ? 'text' : diff <= 0 ? 'success' : 'warning'}>
              {diff != null
                ? tr('{days} {days|ден|дни} · {sign}{kg} кг', '{days} {days|day|days} · {sign}{kg} kg', { days: Math.abs(days), sign: diff <= 0 ? '−' : '+', kg: formatNumber(Math.abs(diff), 1) })
                : tr('{days} {days|ден|дни}', '{days} {days|day|days}', { days: Math.abs(days) })}
            </Txt>
          </Card>

          <SectionHeader title={tr('Преди', 'Before')} />
          <Strip photos={ofPose} selected={before.id} onSelect={setBeforeId} />
          <SectionHeader title={tr('След', 'After')} />
          <Strip photos={ofPose} selected={after.id} onSelect={setAfterId} />
        </>
      )}
    </Screen>
  );
}

/** "After" fills the frame; "before" is clipped to the left of a handle you drag across. */
function BeforeAfter({ before, after }: { before: ProgressPhoto; after: ProgressPhoto }) {
  const t = useTheme();
  const { tr } = useI18n();
  const [width, setWidth] = useState(0);
  // Finger position in px across the frame; null until the first touch (then the handle sits in the middle).
  const [touchX, setTouchX] = useState<number | null>(null);
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        // Keep the gesture while the finger drifts up or down, instead of handing it to the ScrollView.
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => setTouchX(e.nativeEvent.locationX),
        onPanResponderMove: (e) => setTouchX(e.nativeEvent.locationX),
      }),
    []
  );
  const split = touchX == null || width === 0 ? 0.5 : clamp(touchX / width);
  const height = (width * 4) / 3;
  return (
    <View style={[styles.frame, { height: height || undefined, backgroundColor: t.c.surfaceAlt }]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Image source={{ uri: photoUri(after.file) }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <View style={[styles.clip, { width: width * split }]}>
        <Image source={{ uri: photoUri(before.file) }} style={{ width, height }} resizeMode="cover" />
      </View>
      <View style={[styles.divider, { left: width * split - 1 }]}>
        <View style={[styles.handle, { backgroundColor: t.c.accent }]}>
          <Txt v="smallStrong" color={t.c.onAccent}>
            ‹ ›
          </Txt>
        </View>
      </View>
      <Tag text={tr('Преди', 'Before')} />
      <Tag text={tr('След', 'After')} right />
      {/* Transparent layer on top takes the touches, so locationX is always relative to the whole frame. */}
      <View style={StyleSheet.absoluteFill} {...pan.panHandlers} />
    </View>
  );
}

const clamp = (v: number) => Math.min(1, Math.max(0, v));

function Tag({ text, right }: { text: string; right?: boolean }) {
  return (
    <View style={[styles.tag, right ? { right: 8 } : { left: 8 }]}>
      <Txt v="caption" color="#FFFFFF">
        {text}
      </Txt>
    </View>
  );
}

function Stat({ label, date, kg }: { label: string; date: string; kg: number | null }) {
  const { tr } = useI18n();
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Txt v="caption" tone="textMuted">
        {label}
      </Txt>
      <Txt v="bodyStrong">{formatDateLabel(date)}</Txt>
      <Txt v="small" tone="textMuted">
        {kg != null ? `${formatNumber(kg, 1)} ${tr('кг', 'kg')}` : '—'}
      </Txt>
    </View>
  );
}

function Strip({ photos, selected, onSelect }: { photos: ProgressPhoto[]; selected: number; onSelect: (id: number) => void }) {
  const t = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ flexShrink: 0 }}>
      {photos.map((p) => (
        <Pressable key={p.id} onPress={() => onSelect(p.id)} style={[styles.stripItem, { borderColor: p.id === selected ? t.c.accent : 'transparent', backgroundColor: t.c.surfaceAlt }]}>
          <Image source={{ uri: photoUri(p.file) }} style={StyleSheet.absoluteFill} resizeMode="cover" resizeMethod="resize" />
          <View style={styles.stripDate}>
            <Txt v="caption" color="#FFFFFF" numberOfLines={1}>
              {formatDateLabel(p.date)}
            </Txt>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  frame: { width: '100%', aspectRatio: 3 / 4, borderRadius: 16, overflow: 'hidden' },
  clip: { position: 'absolute', top: 0, bottom: 0, left: 0, overflow: 'hidden' },
  divider: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  handle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
  tag: { position: 'absolute', top: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.5)' },
  side: { flex: 1, aspectRatio: 3 / 4, borderRadius: 14, overflow: 'hidden' },
  stripItem: { width: 84, aspectRatio: 3 / 4, borderRadius: 10, overflow: 'hidden', borderWidth: 3 },
  stripDate: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingVertical: 2, paddingHorizontal: 4, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
});
