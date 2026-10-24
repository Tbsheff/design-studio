import { describe, expect, it } from 'vitest';
import { formatMeasure, measureBetween } from './measure';

describe('measureBetween', () => {
  it('measures the gap to a sibling on the right and below', () => {
    expect(measureBetween({ x: 0, y: 0, width: 100, height: 50 }, { x: 124, y: 10, width: 40, height: 20 })).toEqual([{ axis: 'x', from: 100, to: 124, at: 20, value: 24 }]);
    expect(measureBetween({ x: 0, y: 0, width: 100, height: 50 }, { x: 0, y: 66, width: 100, height: 20 })).toEqual([{ axis: 'y', from: 50, to: 66, at: 50, value: 16 }]);
  });

  it('measures four insets to a parent', () => {
    const lines = measureBetween({ x: 10, y: 20, width: 30, height: 30 }, { x: 0, y: 0, width: 100, height: 100 });
    expect(lines.map((l) => l.value)).toEqual([20, 50, 10, 60]);
  });

  it('formats with at most one decimal', () => {
    expect(formatMeasure(16)).toBe('16');
    expect(formatMeasure(12.345)).toBe('12.3');
  });
});
