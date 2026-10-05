import React, { useState } from 'react';
import { Screen, Segmented } from '@/components/ui';
import { DateSwitcher } from '@/components/DateSwitcher';
import { FoodSearch } from '@/components/add/FoodSearch';
import { PhotoCapture } from '@/components/add/PhotoCapture';
import { BarcodeScan } from '@/components/add/BarcodeScan';
import { ManualEntryForm } from '@/components/add/ManualEntryForm';

type Mode = 'database' | 'barcode' | 'photo' | 'manual';

export default function AddScreen() {
  const [mode, setMode] = useState<Mode>('database');

  return (
    <Screen title="Добави храна" right={<DateSwitcher compact />}>
      <Segmented<Mode>
        value={mode}
        onChange={setMode}
        style={{ marginBottom: 12 }}
        options={[
          { label: 'Търси', value: 'database' },
          { label: 'Баркод', value: 'barcode' },
          { label: 'Снимка', value: 'photo' },
          { label: 'Ръчно', value: 'manual' },
        ]}
      />
      {mode === 'database' && <FoodSearch onManual={() => setMode('manual')} />}
      {mode === 'barcode' && <BarcodeScan />}
      {mode === 'photo' && <PhotoCapture />}
      {mode === 'manual' && <ManualEntryForm />}
    </Screen>
  );
}
