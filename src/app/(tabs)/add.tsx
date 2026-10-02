import React, { useState } from 'react';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SegmentedControl } from '@/components/SegmentedControl';
import { FoodSearch } from '@/components/add/FoodSearch';
import { PhotoCapture } from '@/components/add/PhotoCapture';
import { BarcodeScan } from '@/components/add/BarcodeScan';
import { ManualEntryForm } from '@/components/add/ManualEntryForm';

type Mode = 'database' | 'barcode' | 'photo' | 'manual';

export default function AddScreen() {
  const [mode, setMode] = useState<Mode>('database');

  return (
    <ScreenContainer title="Добави храна" subtitle="База храни, баркод, снимка или ръчно">
      <SegmentedControl<Mode>
        value={mode}
        onChange={setMode}
        options={[
          { label: 'База', value: 'database' },
          { label: 'Баркод', value: 'barcode' },
          { label: 'Снимка', value: 'photo' },
          { label: 'Ръчно', value: 'manual' },
        ]}
      />
      {mode === 'database' && <FoodSearch />}
      {mode === 'barcode' && <BarcodeScan />}
      {mode === 'photo' && <PhotoCapture />}
      {mode === 'manual' && <ManualEntryForm />}
    </ScreenContainer>
  );
}
