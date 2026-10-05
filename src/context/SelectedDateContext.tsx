import React, { createContext, useContext, useMemo, useState } from 'react';
import { todayKey } from '@/utils/date';

/** The diary day being viewed on "Днес" — "Добави" writes to the same day, so forgotten meals can be logged later. */
interface SelectedDateValue {
  date: string;
  setDate: (date: string) => void;
}

const SelectedDateContext = createContext<SelectedDateValue | null>(null);

export function SelectedDateProvider({ children }: { children: React.ReactNode }) {
  const [date, setDate] = useState(todayKey());
  const value = useMemo(() => ({ date, setDate }), [date]);
  return <SelectedDateContext.Provider value={value}>{children}</SelectedDateContext.Provider>;
}

export function useSelectedDate(): SelectedDateValue {
  const ctx = useContext(SelectedDateContext);
  if (!ctx) throw new Error('useSelectedDate трябва да се използва вътре в <SelectedDateProvider>.');
  return ctx;
}
