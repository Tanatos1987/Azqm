import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ProfileForm } from '@/components/profile/ProfileForm';
import { useProfile } from '@/context/ProfileContext';
import { colors } from '@/theme/colors';

export default function ProfileScreen() {
  const { profile } = useProfile();
  return (
    <ScreenContainer
      title="Профил"
      subtitle="Промяната преизчислява дневните цели"
      headerRight={
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.close}>Затвори</Text>
        </Pressable>
      }
    >
      <ProfileForm initial={profile} onSaved={() => router.back()} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  close: { color: colors.accent, fontWeight: '600', fontSize: 14 },
});
