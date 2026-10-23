import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import { pngSize } from './png-size.js';

describe('pngSize', () => {
  it('reads width and height from the PNG header', () => {
    const bytes = PNG.sync.write(new PNG({ width: 1440, height: 8000 }));
    expect(pngSize(bytes)).toEqual({ width: 1440, height: 8000 });
  });

  it('rejects bytes that are not a PNG', () => {
    expect(() => pngSize(Buffer.from('not a png at all, just text bytes'))).toThrow(/not a PNG/);
    expect(() => pngSize(Buffer.alloc(10))).toThrow(/not a PNG/);
  });
});
