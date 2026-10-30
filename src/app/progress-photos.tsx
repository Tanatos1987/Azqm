import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, EmptyState, IconButton, Row, Screen, SectionHeader, Segmented, Txt } from '@/components/ui';
import { CameraIcon, ChevronLeftIcon, ChevronRightIcon, CloseIcon, CompareIcon, DownloadIcon, TrashIcon, UploadIcon } from '@/components/icons';
import { ProLock } from '@/components/ProLock';
import { usePro } from '@/context/ProContext';
import { useDataRefresh } from '@/context/DataRefreshContext';
import { useToast } from '@/context/ToastContext';
import { deleteProgressPhoto, getProgressPhotos, getWeightEntries } from '@/db/queries';
import { useTheme } from '@/theme/ThemeContext';
import type { PhotoPose, ProgressPhoto, WeightEntry } from '@/types';
import { POSES, deletePhotoFile, exportPhotoArchive, importPhotoArchive, photoUri, poseLabel, weightOn } from '@/utils/progressPhotos';
import { formatDateLabel, formatNumber } from '@/utils/date';
import { useI18n } from '@/i18n';

type Filter = 'all' | PhotoPose;

export default function ProgressPhotosScreen() {
  const t = useTheme();
  const { tr } = useI18n();
  const { isPro } = usePro();
  const back = (
    <IconButton onPress={() => router.back()} accessibilityLabel={tr('Назад', 'Back')}>
      <ChevronLeftIcon size={24} color={t.c.text} />
    </IconButton>
  );
  if (!isPro) {
    return (
      <Screen title={tr('Снимки за прогрес', 'Progress photos')} left={back} scroll>
        <ProLock emoji="📸" title={tr('Снимки за прогрес', 'Progress photos')} text={tr('Снимай се по време на режима и виж как се променя тялото ти.', 'Take photos during your diet and see how your body changes.')} />
      </Screen>
    );
  }
  return <Gallery back={back} />;
}

function Gallery({ back }: { back: React.ReactNode }) {
  const t = useTheme();
  const { tr } = useI18n();
  const db = useSQLiteContext();
  const toast = useToast();
  const { version, bump } = useDataRefresh();
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<ProgressPhoto | null>(null);
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);

  const load = useCallback(async () => {
    const [p, w] = await Promise.all([getProgressPhotos(db), getWeightEntries(db)]);
    setPhotos(p);
    setWeights(w);
  }, [db]);

  useEffect(() => {
    // Refetch whenever data changes; setState happens after the awaited query.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load, version]);

  // Newest day first, photos of a day in pose order.
  const days = useMemo(() => {
    const shown = photos.filter((p) => filter === 'all' || p.pose === filter);
    const byDate = new Map<string, ProgressPhoto[]>();
    for (const p of shown) byDate.set(p.date, [...(byDate.get(p.date) ?? []), p]);
    return [...byDate.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([date, list]) => ({ date, list: list.sort((a, b) => POSES.indexOf(a.pose) - POSES.indexOf(b.pose)) }));
  }, [photos, filter]);

  const remove = (p: ProgressPhoto) =>
    Alert.alert(tr('Изтриване', 'Delete'), tr('Да изтрия ли тази снимка? Това не може да се отмени.', 'Delete this photo? This can’t be undone.'), [
      { text: tr('Отказ', 'Cancel'), style: 'cancel' },
      {
        text: tr('Изтрий', 'Delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteProgressPhoto(db, p.id);
          deletePhotoFile(p.file);
          setOpen(null);
          bump();
        },
      },
    ]);

  const run = async (kind: 'export' | 'import') => {
    setBusy(kind);
    try {
      if (kind === 'export') await exportPhotoArchive(db);
      else {
        const added = await importPhotoArchive(db);
        if (added != null) {
          bump();
          toast.show(tr('Добавени снимки: {n}', 'Photos added: {n}', { n: added }));
        }
      }
    } catch (err: any) {
      Alert.alert(tr('Грешка', 'Error'), err?.message ?? String(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen
      title={tr('Снимки за прогрес', 'Progress photos')}
      subtitle={tr('{n} {n|снимка|снимки} · само на този телефон', '{n} {n|photo|photos} · only on this phone', { n: photos.length })}
      left={back}
      right={
        photos.length >= 2 ? (
          <IconButton onPress={() => router.push('/progress-compare')} accessibilityLabel={tr('Сравни', 'Compare')}>
            <CompareIcon size={24} color={t.c.text} />
          </IconButton>
        ) : null
      }
      scroll
    >
      <Button label={tr('Направи снимка', 'Take a photo')} icon={<CameraIcon size={22} color={t.c.onAccent} />} onPress={() => router.push('/progress-camera')} />

      {photos.length === 0 ? (
        <EmptyState
          emoji="📸"
          title={tr('Още няма снимки', 'No photos yet')}
          text={tr(
            'Снимай се отпред, отстрани и отзад в началото на режима и после веднъж седмично — на едно и също място и светлина. Така ще видиш промяната, която кантарът не показва.',
            'Take a front, side and back photo when you start your diet and then once a week — in the same place and light. You’ll see changes the scale doesn’t show.'
          )}
        />
      ) : (
        <>
          <Segmented<Filter>
            value={filter}
            onChange={setFilter}
            style={{ marginTop: 16 }}
            options={[{ label: tr('Всички', 'All'), value: 'all' }, ...POSES.map((p) => ({ label: poseLabel(p), value: p }))]}
          />
          {days.map(({ date, list }) => {
            const kg = weightOn(weights, date);
            return (
              <View key={date}>
                <SectionHeader title={kg != null ? `${formatDateLabel(date)} · ${formatNumber(kg, 1)} ${tr('кг', 'kg')}` : formatDateLabel(date)} />
                <Row gap={8} style={{ flexWrap: 'wrap' }}>
                  {list.map((p) => (
                    <Pressable key={p.id} onPress={() => setOpen(p)} style={[styles.thumb, { backgroundColor: t.c.surfaceAlt }]}>
                      <Image source={{ uri: photoUri(p.file) }} style={StyleSheet.absoluteFill} resizeMode="cover" resizeMethod="resize" />
                      <View style={styles.thumbLabel}>
                        <Txt v="caption" color="#FFFFFF">
                          {poseLabel(p.pose)}
                        </Txt>
                      </View>
                    </Pressable>
                  ))}
                </Row>
              </View>
            );
          })}
        </>
      )}

      <SectionHeader title={tr('Архив', 'Archive')} />
      <Card>
        <Txt v="small" tone="textMuted" style={{ marginBottom: 4 }}>
          {tr(
            'Снимките не влизат в резервното копие (.json). Запази ги в архив, за да ги пренесеш на нов телефон.',
            'Photos aren’t part of the backup (.json). Save them to an archive to move them to a new phone.'
          )}
        </Txt>
        <ArchiveRow icon={<UploadIcon size={22} color={t.c.accent} />} title={tr('Запази архив (.zip)', 'Save archive (.zip)')} busy={busy === 'export'} onPress={() => run('export')} />
        <ArchiveRow icon={<DownloadIcon size={22} color={t.c.info} />} title={tr('Добави снимки от архив', 'Add photos from an archive')} busy={busy === 'import'} onPress={() => run('import')} last />
      </Card>

      <Viewer photo={open} weights={weights} onClose={() => setOpen(null)} onDelete={remove} />
    </Screen>
  );
}

function ArchiveRow({ icon, title, onPress, busy, last }: { icon: React.ReactNode; title: string; onPress: () => void; busy: boolean; last?: boolean }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} disabled={busy} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderBottomWidth: last ? 0 : 1, borderBottomColor: t.c.border }, pressed && { opacity: 0.7 }]}>
      {icon}
      <Txt v="bodyStrong" style={{ flex: 1 }}>
        {title}
      </Txt>
      {busy ? <ActivityIndicator color={t.c.accent} /> : <ChevronRightIcon size={20} color={t.c.textMuted} />}
    </Pressable>
  );
}

/** One photo full screen, with its date, pose and weight. */
function Viewer({ photo, weights, onClose, onDelete }: { photo: ProgressPhoto | null; weights: WeightEntry[]; onClose: () => void; onDelete: (p: ProgressPhoto) => void }) {
  const { tr } = useI18n();
  const insets = useSafeAreaInsets();
  const kg = photo ? weightOn(weights, photo.date) : null;
  return (
    <Modal visible={photo != null} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {photo ? <Image source={{ uri: photoUri(photo.file) }} style={StyleSheet.absoluteFill} resizeMode="contain" /> : null}
        <View style={[styles.viewerBar, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={onClose} hitSlop={12} style={styles.roundBtn} accessibilityLabel={tr('Затвори', 'Close')}>
            <CloseIcon size={24} color="#FFFFFF" />
          </Pressable>
          {photo ? (
            <View style={{ flex: 1 }}>
              <Txt v="bodyStrong" color="#FFFFFF">
                {formatDateLabel(photo.date)} · {poseLabel(photo.pose)}
              </Txt>
              {kg != null ? (
                <Txt v="small" color="#FFFFFF">
                  {formatNumber(kg, 1)} {tr('кг', 'kg')}
                </Txt>
              ) : null}
            </View>
          ) : null}
          {photo ? (
            <Pressable onPress={() => onDelete(photo)} hitSlop={12} style={styles.roundBtn} accessibilityLabel={tr('Изтрий', 'Delete')}>
              <TrashIcon size={22} color="#FFFFFF" />
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  thumb: { width: '31.5%', aspectRatio: 3 / 4, borderRadius: 12, overflow: 'hidden' },
  thumbLabel: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingVertical: 4, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)' },
  viewerBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingBottom: 10, backgroundColor: 'rgba(0,0,0,0.45)' },
  roundBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
});
