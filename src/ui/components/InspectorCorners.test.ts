import { describe, expect, it } from 'vitest';
import { joinCorners } from './InspectorCorners';

describe('joinCorners', () => {
  it('writes four values in border-radius order', () => {
    expect(joinCorners({ top: '4px', right: '8px', bottom: '12px', left: '16px' })).toBe('4px 8px 12px 16px');
  });

  it('collapses equal corners to one value', () => {
    expect(joinCorners({ top: '8px', right: '8px', bottom: '8px', left: '8px' })).toBe('8px');
    expect(joinCorners({ top: '', right: '0', bottom: '0', left: '0' })).toBe('0');
  });
});
