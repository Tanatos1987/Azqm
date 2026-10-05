import React from 'react';
import { Screen } from '@/components/ui';
import { ProfileForm } from '@/components/profile/ProfileForm';
import { useI18n } from '@/i18n';

/**
 * Shown until a profile exists. No navigation on save: the Stack.Protected
 * guards in the root layout flip and move the user to the tabs.
 * The language selector sits at the top of the form's first step (ProfileForm `askLanguage`).
 */
export default function OnboardingScreen() {
  const { tr } = useI18n();
  return (
    <Screen
      title={tr('Добре дошли в Azqm', 'Welcome to Azqm')}
      subtitle={tr('Въведи данните си и избери режим — ще изчислим личните ти цели', 'Enter your details and pick a diet — we’ll work out your personal goals')}
    >
      <ProfileForm initial={null} onSaved={() => {}} askDiet askLanguage />
    </Screen>
  );
}
