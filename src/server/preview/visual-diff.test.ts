import { describe, expect, it } from 'vitest';
import { PNG } from 'pngjs';
import { diffFinding, diffImages } from './visual-diff.js';

function image(width: number, height: number, paint?: { x: number; y: number; w: number; h: number }): PNG {
  const png = new PNG({ width, height });
  png.data.fill(255);
  if (paint) {
    for (let y = paint.y; y < paint.y + paint.h; y += 1) {
      for (let x = paint.x; x < paint.x + paint.w; x += 1) {
        const at = (y * width + x) * 4;
        png.data[at] = 0;
        png.data[at + 1] = 0;
        png.data[at + 2] = 0;
      }
    }
  }
  return png;
}

describe('visual diff', () => {
  it('reports the changed share and the band where it changed', () => {
    const diff = diffImages(image(100, 400), image(100, 400, { x: 0, y: 250, w: 100, h: 50 }), []);
    expect(diff.changedPct).toBeCloseTo(12.5, 1);
    expect(diff.bands).toEqual([{ y: 200, height: 200, changedPct: 25 }]);
    expect(diffFinding(diff, 'desktop', true)).toMatchObject({ check: 'visual-diff', severity: 'medium' });
    expect(diffFinding(diff, 'desktop', false).severity).toBe('low');
  });

  it('ignores change inside the selected element', () => {
    const diff = diffImages(image(100, 400), image(100, 400, { x: 30, y: 30, w: 20, h: 20 }), [{ x: 30, y: 30, width: 20, height: 20 }]);
    expect(diff.changedPct).toBe(0);
    expect(diffFinding(diff, 'mobile', true).severity).toBe('low');
  });

  it('compares only above the selection when the page height changed', () => {
    const diff = diffImages(image(100, 400), image(100, 500), [{ x: 0, y: 300, width: 100, height: 40 }]);
    expect(diff.comparedHeight).toBe(276);
    expect(diffFinding(diff, 'desktop', true).message).toContain('Page height changed from 400 to 500 px');
  });
});
