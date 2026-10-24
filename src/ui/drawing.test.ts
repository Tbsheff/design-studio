import { describe, expect, it } from 'vitest';
import { agentText, strokesBox } from '../shared/comments';
import { createStrokeBuilder, minStepFor, strokePath } from './drawing';

describe('drawing strokes', () => {
  it('smooths jitter, drops tiny steps, and ends at the pointer', () => {
    const builder = createStrokeBuilder(0, 0, minStepFor(1));
    expect(builder.add(0.5, 0.2)).toBe(false);
    for (let x = 10; x <= 100; x += 10) builder.add(x, x % 20 === 0 ? 4 : -4);
    builder.end(100, 0);
    const points = builder.points();
    const ys = points.filter((_, index) => index % 2 === 1);
    expect(Math.max(...ys.map(Math.abs))).toBeLessThan(4);
    expect(points.slice(-2)).toEqual([100, 0]);
  });

  it('draws a smooth path with quadratic segments', () => {
    expect(strokePath([0, 0])).toBe('M0 0l0.01 0');
    expect(strokePath([0, 0, 10, 0, 20, 10])).toBe('M0 0Q10 0 15 5L20 10');
  });

  it('measures the stroke box with the pen width', () => {
    expect(strokesBox([])).toBeNull();
    expect(strokesBox([{ color: '#ff3b30', width: 4, points: [10, 20, 110, 70] }])).toEqual({ x: 8, y: 18, width: 104, height: 54 });
  });

  it('puts replies in the text for the agent', () => {
    expect(agentText({ text: 'Red', replies: [] })).toBe('Red');
    expect(agentText({ text: 'Red', replies: [{ id: 'a', text: 'darker\n red', createdAt: 1 }] })).toBe('Red\nReplies:\n- darker red');
  });
});
