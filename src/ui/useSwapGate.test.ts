import { describe, expect, it } from 'vitest';
import { SwapQueue } from './useSwapGate';

const change = (directionId: string, changedAt: number) => ({ directionId, changedAt, receivedAt: changedAt, paths: [] });

describe('SwapQueue', () => {
  it('lets one frame reload at a time and keeps only the newest change per frame', () => {
    const q = new SwapQueue();
    q.offer('a', change('a', 1));
    q.offer('b', change('b', 2));
    q.offer('b', change('b', 3));
    expect(q.inFlight).toBe('a');
    expect([...q.next.keys()]).toEqual(['a']);
    expect(q.done('b')).toBe(false);
    expect(q.done('a')).toBe(true);
    expect(q.shown.get('a')?.changedAt).toBe(1);
    expect(q.inFlight).toBe('b');
    expect(q.next.get('b')?.changedAt).toBe(3);
    q.done('b');
    expect(q.inFlight).toBeNull();
    expect(q.next.size).toBe(0);
  });

  it('gives the back slot up while the live frame holds one, then resumes', () => {
    const q = new SwapQueue();
    q.offer('a', change('a', 1));
    expect(q.hold(true)).toBe(true);
    expect(q.inFlight).toBeNull();
    expect(q.next.size).toBe(0);
    q.offer('b', change('b', 2));
    expect(q.inFlight).toBeNull();
    q.hold(false);
    expect(q.inFlight).toBe('a');
    q.done('a');
    expect(q.inFlight).toBe('b');
  });
});
