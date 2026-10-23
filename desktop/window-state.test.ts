import { describe, expect, it } from 'vitest';
import { layoutKey, parseStateFile, pickState, recordState, type DisplayInfo } from './window-state.js';

const laptop: DisplayInfo = { id: 1, bounds: { x: 0, y: 0, width: 1512, height: 982 }, workArea: { x: 0, y: 25, width: 1512, height: 957 } };
const monitor: DisplayInfo = { id: 2, bounds: { x: 1512, y: 0, width: 2560, height: 1440 }, workArea: { x: 1512, y: 25, width: 2560, height: 1415 } };

describe('window state per display layout', () => {
  it('keeps one entry per display layout and restores the one that matches', () => {
    let file = parseStateFile(null);
    file = recordState(file, [laptop], { bounds: { x: 10, y: 40, width: 1200, height: 800 }, maximized: false });
    file = recordState(file, [laptop, monitor], { bounds: { x: 1600, y: 60, width: 2000, height: 1200 }, maximized: true });
    expect(Object.keys(file.layouts)).toHaveLength(2);
    expect(pickState(file, [laptop])?.bounds.x).toBe(10);
    expect(pickState(file, [monitor, laptop])?.maximized).toBe(true);
  });

  it('falls back to the last layout only when it is still on a display', () => {
    const file = recordState(parseStateFile(null), [laptop, monitor], { bounds: { x: 1600, y: 60, width: 2000, height: 1200 }, maximized: false });
    expect(pickState(file, [laptop])).toBeNull();
    const onLaptop = recordState(parseStateFile(null), [laptop, monitor], { bounds: { x: 20, y: 40, width: 1000, height: 700 }, maximized: false });
    expect(pickState(onLaptop, [laptop])?.bounds.x).toBe(20);
  });

  it('reads the P0 single-state file and drops junk', () => {
    expect(pickState(parseStateFile({ bounds: { x: 5, y: 30, width: 900, height: 700 }, maximized: false }), [laptop])?.bounds.width).toBe(900);
    expect(parseStateFile({ layouts: { a: { bounds: { x: 'no' } } }, last: 'a' })).toEqual({ last: null, layouts: {} });
    expect(layoutKey([monitor, laptop])).toBe(layoutKey([laptop, monitor]));
  });
});
