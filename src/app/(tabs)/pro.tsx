import React from 'react';
import { Redirect } from 'expo-router';

/** The "Подкрепи" tab: its press is caught in the tab layout and opens the support screen; a direct link lands here. */
export default function ProTab() {
  return <Redirect href="/support" />;
}
