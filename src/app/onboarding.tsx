import React from 'react';
import { Screen } from '@/components/ui';
import { ProfileForm } from '@/components/profile/ProfileForm';

/**
 * Shown until a profile exists. No navigation on save: the Stack.Protected
 * guards in the root layout flip and move the user to the tabs.
 */
export default function OnboardingScreen() {
  return (
    <Screen title="Добре дошли в Azqm" subtitle="Въведи данните си и избери режим — ще изчислим личните ти цели">
      <ProfileForm initial={null} onSaved={() => {}} askDiet />
    </Screen>
  );
}
