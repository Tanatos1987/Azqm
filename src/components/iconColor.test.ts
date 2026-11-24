import { describe, expect, test } from '@jest/globals';
import React from 'react';
import { withIconColor } from './iconColor';

// A glass button has a white label, but its icons were coloured for the old solid button (dark on the accent):
// the icon must take the label's colour.
describe('withIconColor', () => {
  const Icon = (_: { color?: string; size?: number }) => null;

  test('recolours an icon and keeps its other props', () => {
    const out = withIconColor(React.createElement(Icon, { color: '#0A0F1F', size: 22 }), '#FFFFFF') as React.ReactElement<{ color: string; size: number }>;
    expect(out.props.color).toBe('#FFFFFF');
    expect(out.props.size).toBe(22);
  });

  test('leaves anything that is not an element alone', () => {
    expect(withIconColor(null, '#FFFFFF')).toBeNull();
    expect(withIconColor(undefined, '#FFFFFF')).toBeUndefined();
  });
});
