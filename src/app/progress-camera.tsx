import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions, type CameraCapturedPicture } from 'expo-camera';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Screen, Txt } from '@/components/ui';
import { CameraIcon, CloseIcon, FlipCameraIcon, TimerIcon } from '@/components/icons';
import { ProLock } from '@/components/ProLock';
import { usePro } from '@/context/ProContext';
import { useDataRefresh } from '@/context/DataRefreshContext';
import { useToast } from '@/context/ToastContext';
import { addProgressPhoto, getProgressPhotos } from '@/db/queries';
import { useTheme } from '@/theme/ThemeContext';
import type { PhotoPose, ProgressPhoto } from '@/types';
import { POSES, keepCapture, photoUri, poseLabel } from '@/utils/progressPhotos';
import { todayKey } from '@/utils/date';
import { useI18n } from '@/i18n';

const TIMERS = [0, 3, 10] as const;
/** Long side of the saved photo: sharp enough to compare, small enough (≈0.5 MB) for hundreds of them. */
const MAX_SIDE = 2048;

/** Largest picture size the camera offers with the long side ≤ MAX_SIDE ("4000x3000"-style strings). */
function pickPictureSize(sizes: string[]): string | undefined {
  let best: { size: string; area: number } | undefined;
  for (const size of sizes) {
    const [w, h] = size.split('x').map(Number);
    if (!(w > 0 && h > 0) || Math.max(w, h) > MAX_SIDE) continue;
    if (!best || w * h > best.area) best = { size, area: w * h };
  }
  return best?.size;
}

export default function ProgressCameraScreen() {
  const { tr } = useI18n();
  const { isPro } = usePro();
  const [permission, requestPermission] = useCameraPermissions();
  const t = useTheme();

  if (!isPro) {
    return (
      <Screen title={tr('Снимки за прогрес', 'Progress photos')} left={<CloseButton />}>
        <ProLock emoji="📸" title={tr('Снимки за прогрес', 'Progress photos')} text={tr('Снимай се по време на режима и виж как се променя тялото ти.', 'Take photos during your diet and see how your body changes.')} />
      </Screen>
    );
  }
  if (!permission) return <ActivityIndicator color={t.c.accent} style={{ flex: 1, backgroundColor: '#000' }} />;
  if (!permission.granted) {
    return (
      <Screen title={tr('Снимки за прогрес', 'Progress photos')} left={<CloseButton />}>
        <Card style={{ alignItems: 'center', gap: 12 }}>
          <Txt center>{tr('Нужен е достъп до камерата, за да се снимаш.', 'Camera access is needed to take your photos.')}</Txt>
          <Button label={tr('Разреши достъп', 'Allow access')} onPress={requestPermission} />
        </Card>
      </Screen>
    );
  }
  return <Capture />;
}

function CloseButton({ light }: { light?: boolean }) {
  const t = useTheme();
  const { tr } = useI18n();
  return (
    <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel={tr('Затвори', 'Close')} style={styles.roundBtn}>
      <CloseIcon size={24} color={light ? '#FFFFFF' : t.c.text} />
    </Pressable>
  );
}

function Capture() {
  const t = useTheme();
  const { tr } = useI18n();
  const db = useSQLiteContext();
  const { bump } = useDataRefresh();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView | null>(null);
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const [pose, setPose] = useState<PhotoPose>('front');
  const [timer, setTimer] = useState<(typeof TIMERS)[number]>(3);
  const [ghost, setGhost] = useState(true);
  const [pictureSize, setPictureSize] = useState<string | undefined>();
  const [countdown, setCountdown] = useState<number | null>(null);
  const [shot, setShot] = useState<CameraCapturedPicture | null>(null);
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);

  useEffect(() => {
    getProgressPhotos(db).then(setPhotos);
  }, [db]);

  // The last photo of this pose, drawn faintly over the preview so the next one lines up with it.
  const previous = useMemo(() => [...photos].reverse().find((p) => p.pose === pose), [photos, pose]);

  const onCameraReady = async () => {
    try {
      setPictureSize(pickPictureSize(await cameraRef.current!.getAvailablePictureSizesAsync()));
    } catch {
      setPictureSize(undefined);
    }
  };

  const capture = useCallback(async () => {
    const pic = await cameraRef.current?.takePictureAsync({ quality: 0.7 });
    if (pic) setShot(pic);
  }, []);

  // Self-timer: counts down once a second, then takes the photo.
  useEffect(() => {
    if (countdown == null) return;
    const id = setTimeout(() => {
      if (countdown > 1) {
        setCountdown(countdown - 1);
      } else {
        setCountdown(null);
        capture();
      }
    }, 1000);
    return () => clearTimeout(id);
  }, [countdown, capture]);

  const shoot = () => (timer > 0 ? setCountdown(timer) : capture());

  const save = async () => {
    if (!shot) return;
    setSaving(true);
    try {
      const file = await keepCapture(shot.uri, pose);
      await addProgressPhoto(db, { date: todayKey(), timeIso: new Date().toISOString(), pose, file, width: shot.width, height: shot.height });
      setPhotos(await getProgressPhotos(db));
      bump();
      toast.show(tr('Снимката „{pose}“ е запазена', '“{pose}” photo saved', { pose: poseLabel(pose) }));
      setShot(null);
      // Next pose in the usual order, so front → side → back is three taps.
      const next = POSES[POSES.indexOf(pose) + 1];
      if (next) setPose(next);
    } finally {
      setSaving(false);
    }
  };

  if (shot) {
    return (
      <View style={styles.black}>
        <Image source={{ uri: shot.uri }} style={StyleSheet.absoluteFill} resizeMode="contain" />
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20 }]}>
          <Button label={tr('Отново', 'Retake')} variant="secondary" flex onPress={() => setShot(null)} disabled={saving} />
          <Button label={tr('Запази', 'Save')} flex onPress={save} disabled={saving} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.black}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} mirror={facing === 'front'} pictureSize={pictureSize} onCameraReady={onCameraReady} />
      {ghost && previous ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Image source={{ uri: photoUri(previous.file) }} style={[StyleSheet.absoluteFill, { opacity: 0.35 }]} resizeMode="cover" />
        </View>
      ) : null}
      {/* Centre line and thirds help to stand in the same place every time. */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[styles.guideV, { left: '50%' }]} />
        <View style={[styles.guideH, { top: '33.3%' }]} />
        <View style={[styles.guideH, { top: '66.6%' }]} />
      </View>

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <View style={styles.topRow}>
          <CloseButton light />
          <Pressable onPress={() => setFacing((f) => (f === 'front' ? 'back' : 'front'))} hitSlop={12} style={styles.roundBtn} accessibilityLabel={tr('Смени камерата', 'Switch camera')}>
            <FlipCameraIcon size={24} color="#FFFFFF" />
          </Pressable>
        </View>
        <View style={styles.poseRow}>
          {POSES.map((p) => (
            <Pressable key={p} onPress={() => setPose(p)} style={[styles.poseChip, pose === p && { backgroundColor: t.c.accent }]}>
              <Txt v="smallStrong" color={pose === p ? t.c.onAccent : '#FFFFFF'} numberOfLines={1}>
                {poseLabel(p)}
              </Txt>
            </Pressable>
          ))}
        </View>
      </View>

      {countdown != null ? (
        <View pointerEvents="none" style={styles.countdown}>
          <Txt style={{ fontSize: 120, lineHeight: 140, fontWeight: '800' }} color="#FFFFFF">
            {countdown}
          </Txt>
        </View>
      ) : null}

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20 }]}>
        <Pressable onPress={() => setTimer(TIMERS[(TIMERS.indexOf(timer) + 1) % TIMERS.length])} style={styles.sideBtn} accessibilityLabel={tr('Самоснимачка', 'Self-timer')}>
          <TimerIcon size={24} color="#FFFFFF" />
          <Txt v="caption" color="#FFFFFF">
            {timer > 0 ? tr('{s} с', '{s} s', { s: timer }) : tr('изкл.', 'off')}
          </Txt>
        </Pressable>
        <Pressable
          onPress={countdown == null ? shoot : () => setCountdown(null)}
          style={[styles.shutter, { backgroundColor: countdown == null ? t.c.accent : t.c.danger }]}
          accessibilityLabel={countdown == null ? tr('Снимай', 'Take photo') : tr('Спри', 'Stop')}
        >
          {countdown == null ? <CameraIcon size={32} color={t.c.onAccent} /> : <CloseIcon size={30} color="#FFFFFF" />}
        </Pressable>
        <Pressable onPress={() => setGhost((g) => !g)} style={[styles.sideBtn, !previous && { opacity: 0.4 }]} disabled={!previous} accessibilityLabel={tr('Контур от предишната снимка', 'Outline of the previous photo')}>
          <Txt style={{ fontSize: 22 }}>👻</Txt>
          <Txt v="caption" color="#FFFFFF">
            {ghost && previous ? tr('контур', 'outline') : tr('без контур', 'no outline')}
          </Txt>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  black: { flex: 1, backgroundColor: '#000' },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', gap: 10, paddingHorizontal: 12 },
  topRow: { alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'space-between' },
  poseRow: { flexDirection: 'row', gap: 6, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 20, padding: 4 },
  poseChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16 },
  roundBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', gap: 12, paddingHorizontal: 20, paddingTop: 16, backgroundColor: 'rgba(0,0,0,0.35)' },
  shutter: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#FFFFFF' },
  sideBtn: { width: 76, alignItems: 'center', gap: 4 },
  countdown: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  guideV: { position: 'absolute', top: 0, bottom: 0, width: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.35)' },
  guideH: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.35)' },
});
