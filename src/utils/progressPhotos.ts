/**
 * Progress photo files (Pro). Images are kept in <documents>/progress-photos — private to the app, never in the
 * phone's gallery and never uploaded; the DB row only holds the file name. They are not part of the JSON backup
 * (it would grow to hundreds of MB); a separate .zip archive moves them to another phone.
 */
import type { SQLiteDatabase } from 'expo-sqlite';
import { Directory, File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate';
import { addProgressPhoto, getProgressPhotos } from '@/db/queries';
import type { PhotoPose, ProgressPhoto, WeightEntry } from '@/types';
import { todayKey } from './date';
import { writeAndShare } from './export';
import { tr } from '@/i18n';

const DIR_NAME = 'progress-photos';
const MANIFEST = 'azqm-photos.json';
/** Names the app itself creates: <timestamp>-<pose>.jpg. Anything else in an archive is ignored. */
const SAFE_NAME = /^\d+-(front|side|back)\.jpg$/;

export const POSES: readonly PhotoPose[] = ['front', 'side', 'back'];

/** English says "… view": a plain "Back" would share its catalog key with the "Back" (go back) buttons. */
export function poseLabel(pose: PhotoPose): string {
  return { front: tr('Отпред', 'Front view'), side: tr('Отстрани', 'Side view'), back: tr('Отзад', 'Back view') }[pose];
}

function photoDir(): Directory {
  const dir = new Directory(Paths.document, DIR_NAME);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

export function photoUri(file: string): string {
  return new File(photoDir(), file).uri;
}

/** Moves a camera capture out of the cache into the photo folder; returns the new file name. */
export async function keepCapture(cacheUri: string, pose: PhotoPose): Promise<string> {
  const name = `${Date.now()}-${pose}.jpg`;
  await new File(cacheUri).move(new File(photoDir(), name));
  return name;
}

export function deletePhotoFile(file: string) {
  const f = new File(photoDir(), file);
  if (f.exists) f.delete();
}

export function deleteAllPhotoFiles() {
  const dir = new Directory(Paths.document, DIR_NAME);
  if (dir.exists) dir.delete();
}

/** Weight logged on the photo's day, or the last one before it. */
export function weightOn(weights: WeightEntry[], date: string): number | null {
  let found: number | null = null;
  for (const w of weights) {
    if (w.date > date) break;
    found = w.weightKg;
  }
  return found;
}

interface PhotoManifest {
  app: 'azqm-photos';
  version: 1;
  photos: Omit<ProgressPhoto, 'id'>[];
}

export async function exportPhotoArchive(db: SQLiteDatabase) {
  const photos = await getProgressPhotos(db);
  if (photos.length === 0) throw new Error(tr('Още няма снимки.', 'No photos yet.'));
  const manifest: PhotoManifest = { app: 'azqm-photos', version: 1, photos: photos.map(({ id: _id, ...p }) => p) };
  const files: Zippable = { [MANIFEST]: strToU8(JSON.stringify(manifest)) };
  for (const p of photos) {
    const f = new File(photoDir(), p.file);
    // JPEGs don't compress further; level 0 just stores them.
    if (f.exists) files[p.file] = [await f.bytes(), { level: 0 }];
  }
  await writeAndShare(`azqm-photos-${todayKey()}.zip`, zipSync(files), 'application/zip', tr('Снимки за прогрес', 'Progress photos'));
}

/** Adds the photos from an archive made by exportPhotoArchive; returns how many were new, null when cancelled. */
export async function importPhotoArchive(db: SQLiteDatabase): Promise<number | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: ['application/zip', '*/*'], copyToCacheDirectory: true, multiple: false });
  if (res.canceled || !res.assets?.[0]) return null;
  const notArchive = () => new Error(tr('Файлът не е архив със снимки от Azqm.', 'The file is not an Azqm photo archive.'));
  let entries: Record<string, Uint8Array>;
  let manifest: PhotoManifest;
  try {
    entries = unzipSync(await new File(res.assets[0].uri).bytes());
    manifest = JSON.parse(strFromU8(entries[MANIFEST]));
  } catch {
    throw notArchive();
  }
  if (manifest?.app !== 'azqm-photos' || !Array.isArray(manifest.photos)) throw notArchive();

  const existing = new Set((await getProgressPhotos(db)).map((p) => p.file));
  let added = 0;
  for (const p of manifest.photos) {
    const bytes = entries[p.file];
    if (!bytes || existing.has(p.file) || !SAFE_NAME.test(p.file) || !POSES.includes(p.pose)) continue;
    const f = new File(photoDir(), p.file);
    f.create({ overwrite: true });
    f.write(bytes);
    await addProgressPhoto(db, { date: p.date, timeIso: p.timeIso, pose: p.pose, file: p.file, width: p.width ?? 0, height: p.height ?? 0 });
    added++;
  }
  return added;
}
