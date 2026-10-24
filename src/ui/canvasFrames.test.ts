import { describe, expect, it } from 'vitest';
import { zoomKeyOf } from '../shared/contracts';
import { addFrame, boundsOf, defaultLayout, FRAME_GAP, frameName, moveFrame, parseLayout, removeFrame, resizeActive, viewportOf } from './canvasFrames';

const desktop = { preset: 'desktop' as const, width: 1440, height: 900 };

describe('canvas frames', () => {
  it('adds frames to the right of the others and keeps the bounds', () => {
    let layout = defaultLayout(desktop);
    layout = addFrame(layout, { width: 768, height: 1024 });
    layout = addFrame(layout, { width: 390, height: 844 });
    expect(layout.frames.map((f) => [f.id, f.x, f.y])).toEqual([
      ['f1', 0, 0],
      ['f2', 1440 + FRAME_GAP, 0],
      ['f3', 1440 + 768 + FRAME_GAP * 2, 0],
    ]);
    expect(boundsOf(layout.frames)).toEqual({ x: 0, y: 0, width: 1440 + 768 + 390 + FRAME_GAP * 2, height: 1024 });
  });

  it('moves, resizes and removes frames; the last frame stays', () => {
    let layout = addFrame(defaultLayout(desktop), { width: 390, height: 844 });
    layout = moveFrame(layout, 'f2', 10.4, -20.6);
    expect(layout.frames[1]).toMatchObject({ x: 1530, y: -21 });
    layout = resizeActive(layout, 1000, 700);
    expect(frameName(layout.frames[0] as { width: number; height: number })).toBe('1000 × 700');
    layout = removeFrame(layout, 'f1');
    expect(layout.activeId).toBe('f2');
    expect(removeFrame(layout, 'f2')).toBe(layout);
    expect(viewportOf({ width: 390, height: 844 })).toEqual({ preset: 'mobile', width: 390, height: 844 });
  });

  it('drops bad stored data', () => {
    expect(parseLayout({ frames: [{ id: 'f1', width: 10, height: 900, x: 0, y: 0 }], activeId: 'f1' })).toBeNull();
    expect(parseLayout({ frames: [{ id: 'x', width: 1440, height: 900, x: 0, y: 0 }], activeId: 'x' })).toBeNull();
    expect(parseLayout({ frames: [{ id: 'f2', width: 1440, height: 900, x: 5, y: 6 }], activeId: 'f9' })).toEqual({ frames: [{ id: 'f2', width: 1440, height: 900, x: 5, y: 6 }], activeId: 'f2' });
  });
});

describe('zoomKeyOf', () => {
  const key = (k: string, code: string, mods: Partial<{ ctrlKey: boolean; metaKey: boolean; altKey: boolean; shiftKey: boolean }> = {}) =>
    zoomKeyOf({ key: k, code, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...mods });

  it('maps Figma keys', () => {
    expect(key('!', 'Digit1', { shiftKey: true })).toBe('fit');
    expect(key('@', 'Digit2', { shiftKey: true })).toBe('selection');
    expect(key(')', 'Digit0', { shiftKey: true })).toBe('actual');
    expect(key('0', 'Digit0', { metaKey: true })).toBe('actual');
    expect(key('1', 'Digit1', { metaKey: true })).toBe('fit');
    expect(key('=', 'Equal', { metaKey: true })).toBe('in');
    expect(key('-', 'Minus', { ctrlKey: true })).toBe('out');
    expect(key('=', 'Equal')).toBe('in');
    expect(key('+', 'Equal', { shiftKey: true })).toBe('in');
    expect(key('-', 'Minus')).toBe('out');
    expect(key('1', 'Digit1')).toBeNull();
    expect(key('¡', 'Digit1', { altKey: true })).toBeNull();
  });
});
