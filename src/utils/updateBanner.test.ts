import { describe, expect, test } from '@jest/globals';
import { updateBanner, type UpdateState } from './updateBanner';

const base: UpdateState = { available: false, flexibleAllowed: false, immediateAllowed: false, inProgress: false, downloading: false, dismissed: false };

// Owner, 24.11.2026: "добави и известие за актуализация вътре в приложението" (as in Real Spy Detector).
describe('updateBanner', () => {
  test('nothing new: no card', () => {
    expect(updateBanner(base)).toBe('none');
  });

  test('a new version on Google Play is offered', () => {
    expect(updateBanner({ ...base, available: true, flexibleAllowed: true })).toBe('available');
    expect(updateBanner({ ...base, available: true, immediateAllowed: true })).toBe('available');
  });

  test('an update Google Play will not let us start is not offered', () => {
    expect(updateBanner({ ...base, available: true })).toBe('none');
  });

  test('"Later" hides the offer, but never a download that is running', () => {
    expect(updateBanner({ ...base, available: true, flexibleAllowed: true, dismissed: true })).toBe('none');
    expect(updateBanner({ ...base, available: true, flexibleAllowed: true, downloading: true, dismissed: true })).toBe('downloading');
  });

  test('an update started before (app closed meanwhile) is offered again, to finish it', () => {
    expect(updateBanner({ ...base, inProgress: true })).toBe('available');
  });
});
