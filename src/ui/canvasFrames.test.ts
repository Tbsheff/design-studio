import { describe, expect, it } from 'vitest';
import { zoomKeyOf } from '../shared/contracts';
import { addFrame, boundsOf, cleanFramePath, defaultLayout, followDirection, FRAME_GAP, frameName, keepDirection, moveFrame, parseLayout, placeDirections, removeFrame, resizeActive, resizeFrame, setFramePath, viewportOf, withFramePath } from './canvasFrames';

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

describe('frames per direction', () => {
  const group = ['va', 'vb', 'vc'];

  it('loads old records without a direction and keeps a valid direction and path', () => {
    const old = { frames: [{ id: 'f1', width: 1440, height: 900, x: 0, y: 0 }], activeId: 'f1' };
    expect(parseLayout(old)).toEqual(old);
    const stored = { frames: [{ id: 'f1', width: 1440, height: 900, x: 0, y: 0, directionId: 'd_1', path: 'about.html' }, { id: 'f2', width: 390, height: 844, x: 0, y: 0, directionId: '../x', path: '../secret' }], activeId: 'f1' };
    expect(parseLayout(stored)?.frames).toEqual([
      { id: 'f1', width: 1440, height: 900, x: 0, y: 0, directionId: 'd_1', path: 'about.html' },
      { id: 'f2', width: 390, height: 844, x: 0, y: 0 },
    ]);
  });

  it('places one frame per variation in a row under the others and binds the old frame', () => {
    const layout = placeDirections(defaultLayout(desktop), group, 'main', false);
    expect(layout.activeId).toBe('f1');
    expect(layout.frames.map((f) => [f.id, f.directionId, f.x, f.y])).toEqual([
      ['f1', 'main', 0, 0],
      ['f2', 'va', 0, 900 + FRAME_GAP * 2],
      ['f3', 'vb', 1440 + FRAME_GAP, 900 + FRAME_GAP * 2],
      ['f4', 'vc', (1440 + FRAME_GAP) * 2, 900 + FRAME_GAP * 2],
    ]);
    expect(placeDirections(layout, group, 'main', false)).toEqual(layout);
  });

  it('drops the empty source frame when asked', () => {
    const layout = placeDirections(defaultLayout(desktop), group, 'main', true);
    expect(layout.frames.map((f) => f.directionId)).toEqual(group);
    expect(layout.activeId).toBe(layout.frames[0]?.id);
  });

  it('keep removes the other variation frames only and makes the kept frame active', () => {
    const placed = placeDirections(defaultLayout(desktop), group, 'main', false);
    const kept = keepDirection(placed, 'vc', group);
    expect(kept.frames.map((f) => f.directionId)).toEqual(['main', 'vc']);
    expect(kept.activeId).toBe('f4');
    const back = placeDirections(kept, group, 'vc', false);
    expect(back.frames.map((f) => f.directionId).sort()).toEqual(['main', 'va', 'vb', 'vc']);
    expect(new Set(back.frames.map((f) => f.id)).size).toBe(4);
  });

  it('follows a direction change from outside the canvas', () => {
    const placed = placeDirections(defaultLayout(desktop), group, 'main', false);
    expect(followDirection(placed, 'vb').activeId).toBe('f3');
    expect(followDirection(placed, 'main')).toBe(placed);
    const rebound = followDirection(placed, 'other');
    expect(rebound.frames.find((f) => f.id === 'f1')?.directionId).toBe('other');
    const unbound = addFrame(defaultLayout(desktop), { width: 390, height: 844 });
    expect(followDirection(unbound, 'any')).toBe(unbound);
  });

  it('resizes a frame with a floor of 240 and whole pixels', () => {
    const layout = resizeFrame(defaultLayout(desktop), 'f1', 100.4, 1000.6);
    expect(layout.frames[0]).toMatchObject({ width: 240, height: 1001 });
    expect(resizeFrame(layout, 'nope', 500, 500)).toBe(layout);
  });

  it('accepts only relative paths without dot segments', () => {
    expect(cleanFramePath(' /about.html ')).toBe('about.html');
    expect(cleanFramePath('docs/intro.html')).toBe('docs/intro.html');
    expect(cleanFramePath('')).toBe('');
    for (const bad of ['../x.html', 'a/../../b', './a', 'a\\b', 'https://x.test/', 'a?b', '%2e%2e/x', 'a b']) expect(cleanFramePath(bad)).toBeNull();
    const layout = setFramePath(defaultLayout(desktop), 'f1', 'about.html');
    expect(layout.frames[0]?.path).toBe('about.html');
    expect(setFramePath(layout, 'f1', '../x')).toBe(layout);
    expect(setFramePath(layout, 'f1', '').frames[0]).not.toHaveProperty('path');
  });

  it('puts the path under the direction folder and keeps the query', () => {
    expect(withFramePath('http://p.localhost:1/d1/?t=1', 'about.html')).toBe('http://p.localhost:1/d1/about.html?t=1');
    expect(withFramePath('http://p.localhost:1/d1/index.html', 'docs/a.html')).toBe('http://p.localhost:1/d1/docs/a.html');
    expect(withFramePath('http://localhost:5300/', 'pricing')).toBe('http://localhost:5300/pricing');
    expect(withFramePath('http://localhost:5300/', undefined)).toBe('http://localhost:5300/');
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
