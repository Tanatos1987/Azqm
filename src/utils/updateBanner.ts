/**
 * The "new version" card on Today (owner, 24.11.2026, as in Real Spy Detector). Google Play decides whether an update
 * is there and which kind it allows; "Later" hides the offer until the next start, never a download that is running.
 * A download that finished while the app was closed shows as an offer again: tapping it installs it.
 */
export type UpdateBanner = 'none' | 'available' | 'downloading';

export interface UpdateState {
  /** Google Play has a newer version for this phone */
  available: boolean;
  flexibleAllowed: boolean;
  immediateAllowed: boolean;
  /** an update started earlier is not finished (downloading or downloaded) */
  inProgress: boolean;
  /** the user started a download in this session */
  downloading: boolean;
  /** "Later" in this session */
  dismissed: boolean;
}

export function updateBanner(s: UpdateState): UpdateBanner {
  if (s.downloading) return 'downloading';
  if (s.dismissed) return 'none';
  if (s.inProgress) return 'available';
  return s.available && (s.flexibleAllowed || s.immediateAllowed) ? 'available' : 'none';
}
