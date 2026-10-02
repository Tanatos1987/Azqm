import React from 'react';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ProfileForm } from '@/components/profile/ProfileForm';

/**
 * Shown until a profile exists. No navigation on save: the Stack.Protected
 * guards in the root layout flip and move the user to the tabs.
 */
export default function OnboardingScreen() {
  return (
    <ScreenContainer title="Добре дошли" subtitle="Въведи данните си, за да изчислим личните ти цели">
      <ProfileForm initial={null} onSaved={() => {}} />
    </ScreenContainer>
  );
}
