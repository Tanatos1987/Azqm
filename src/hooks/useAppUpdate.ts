import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as InAppUpdates from 'expo-in-app-updates';
import { updateBanner, type UpdateBanner } from '@/utils/updateBanner';

/**
 * Google Play in-app updates (expo-in-app-updates, MIT). Checks when the app starts and whenever it comes back to the
 * front; "Update" downloads the new version in the background (a flexible update) and the library restarts Azqm into
 * it as soon as the download is done. Builds not installed from Google Play (preview APKs) never see a card.
 */
export function useAppUpdate(): { banner: UpdateBanner; start: () => void; dismiss: () => void } {
  const [info, setInfo] = useState<InAppUpdates.UpdateInfo | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    // Not installed from Google Play, or no Play services: the check fails and there is no card.
    const check = () => InAppUpdates.checkForUpdate().then(setInfo, () => undefined);
    check();
    const app = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    const offStart = InAppUpdates.addUpdateListener('updateStart', (e) => {
      if (e.updateType === 'FLEXIBLE') setDownloading(true);
    });
    const offCancel = InAppUpdates.addUpdateListener('updateCancelled', () => setDownloading(false));
    return () => {
      app.remove();
      offStart();
      offCancel();
    };
  }, []);

  const start = useCallback(() => {
    // Flexible (download in the background) whenever Play allows it; otherwise Play's full-screen update.
    InAppUpdates.startUpdate(!(info?.flexibleAllowed ?? false))
      .then((started) => {
        // An earlier download still running in the background: Play starts nothing new, the library restarts the app
        // when it is done.
        if (!started && info?.updateInProgress) setDownloading(true);
      })
      .catch(() => undefined);
  }, [info]);

  const banner = updateBanner({
    available: info?.updateAvailable ?? false,
    flexibleAllowed: info?.flexibleAllowed ?? false,
    immediateAllowed: info?.immediateAllowed ?? false,
    inProgress: info?.updateInProgress ?? false,
    downloading,
    dismissed,
  });
  return { banner, start, dismiss: () => setDismissed(true) };
}
