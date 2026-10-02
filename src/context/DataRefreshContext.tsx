import React, { createContext, useCallback, useContext, useState } from 'react';

/**
 * Tabs stay mounted when you switch between them in expo-router, so a plain
 * useEffect on the "Today" screen won't refire when you add an entry from the
 * "Add" tab. This tiny pub/sub lets any screen bump a shared version counter
 * after writing to SQLite, and any screen re-fetch by depending on it.
 */
interface DataRefreshContextValue {
  version: number;
  bump: () => void;
}

const DataRefreshContext = createContext<DataRefreshContextValue | null>(null);

export function DataRefreshProvider({ children }: { children: React.ReactNode }) {
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);
  return <DataRefreshContext.Provider value={{ version, bump }}>{children}</DataRefreshContext.Provider>;
}

export function useDataRefresh(): DataRefreshContextValue {
  const ctx = useContext(DataRefreshContext);
  if (!ctx) throw new Error('useDataRefresh трябва да се използва вътре в <DataRefreshProvider>.');
  return ctx;
}
