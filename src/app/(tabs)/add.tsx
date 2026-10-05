import React, { useState } from 'react';
import { Screen, Segmented } from '@/components/ui';
import { DateSwitcher } from '@/components/DateSwitcher';
import { FoodSearch } from '@/components/add/FoodSearch';
import { PhotoCapture } from '@/components/add/PhotoCapture';
import { BarcodeScan } from '@/components/add/BarcodeScan';
import { ManualEntryForm } from '@/components/add/ManualEntryForm';
import { useI18n } from '@/i18n';

type Mode = 'database' | 'barcode' | 'photo' | 'manual';

export default function AddScreen() {
  const { tr } = useI18n();
  const [mode, setMode] = useState<Mode>('database');

  return (
    <Screen title={tr('Добави храна', 'Add food')} right={<DateSwitcher compact />}>
      <Segmented<Mode>
        value={mode}
        onChange={setMode}
        style={{ marginBottom: 12 }}
        options={[
          { label: tr('Търси', 'Search'), value: 'database' },
          { label: tr('Баркод', 'Barcode'), value: 'barcode' },
          { label: tr('Снимка', 'Photo'), value: 'photo' },
          { label: tr('Ръчно', 'Manual'), value: 'manual' },
        ]}
      />
      {mode === 'database' && <FoodSearch onManual={() => setMode('manual')} />}
      {mode === 'barcode' && <BarcodeScan />}
      {mode === 'photo' && <PhotoCapture />}
      {mode === 'manual' && <ManualEntryForm />}
    </Screen>
  );
}
