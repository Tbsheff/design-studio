import { describe, expect, it } from 'vitest';
import type { StudioEvent } from '../shared/contracts';
import { createEventHub, type EventSourceLike } from './eventHub';

class FakeSource implements EventSourceLike {
  onopen: EventSourceLike['onopen'] = null;
  onmessage: EventSourceLike['onmessage'] = null;
  onerror: EventSourceLike['onerror'] = null;
  closed = false;
  listeners = new Map<string, EventListener[]>();
  constructor(
    readonly projectId: string,
    readonly after: number,
  ) {}
  addEventListener(type: string, listener: EventListener): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }
  close(): void {
    this.closed = true;
  }
  open(): void {
    this.onopen?.call(this as unknown as EventSource, new Event('open'));
  }
  fail(): void {
    this.onerror?.call(this as unknown as EventSource, new Event('error'));
  }
  send(event: Partial<StudioEvent> & { type: string; seq: number }): void {
    const msg = { data: JSON.stringify(event) } as MessageEvent<string>;
    for (const listener of this.listeners.get(event.type) ?? []) listener(msg as unknown as Event);
  }
}

function setup() {
  const sources: FakeSource[] = [];
  const timers: (() => void)[] = [];
  const deferred: (() => void)[] = [];
  const hub = createEventHub({
    open: (projectId, after) => {
      const source = new FakeSource(projectId, after);
      sources.push(source);
      return source;
    },
    setTimer: (fn) => timers.push(fn),
    clearTimer: () => undefined,
    defer: (fn) => deferred.push(fn),
  });
  const flushDeferred = () => {
    for (const fn of deferred.splice(0)) fn();
  };
  return { hub, sources, timers, flushDeferred };
}

const files = (seq: number) => ({ type: 'files.changed', seq, ts: seq, projectId: 'p1' }) as const;

describe('event hub', () => {
  it('opens one connection per project for many subscribers', () => {
    const { hub, sources } = setup();
    const a: number[] = [];
    const b: number[] = [];
    hub.subscribe('p1', (e) => a.push(e.seq));
    hub.subscribe('p1', (e) => b.push(e.seq));
    hub.watchState('p1', () => undefined);
    expect(sources).toHaveLength(1);
    expect(sources[0]?.after).toBe(0);
    sources[0]?.send(files(1));
    sources[0]?.send(files(2));
    expect(a).toEqual([1, 2]);
    expect(b).toEqual([1, 2]);
  });

  it('drops events with a seq at or below the last one', () => {
    const { hub, sources } = setup();
    const seen: number[] = [];
    hub.subscribe('p1', (e) => seen.push(e.seq));
    sources[0]?.send(files(3));
    sources[0]?.send(files(3));
    sources[0]?.send(files(2));
    sources[0]?.send(files(4));
    expect(seen).toEqual([3, 4]);
  });

  it('reconnects after the last seq and reports the state', () => {
    const { hub, sources, timers } = setup();
    const states: string[] = [];
    hub.subscribe('p1', () => undefined);
    hub.watchState('p1', () => states.push(hub.state('p1')));
    sources[0]?.open();
    sources[0]?.send(files(7));
    sources[0]?.fail();
    expect(sources[0]?.closed).toBe(true);
    expect(hub.state('p1')).toBe('reconnecting');
    timers.shift()?.();
    expect(sources).toHaveLength(2);
    expect(sources[1]?.after).toBe(7);
    sources[1]?.open();
    expect(states).toEqual(['open', 'reconnecting', 'open']);
  });

  it('keeps the connection through an unsubscribe and resubscribe in one task', () => {
    const { hub, sources, flushDeferred } = setup();
    const off = hub.subscribe('p1', () => undefined);
    off();
    hub.subscribe('p1', () => undefined);
    flushDeferred();
    expect(sources).toHaveLength(1);
    expect(sources[0]?.closed).toBe(false);
  });

  it('closes when the last subscriber leaves and replays from zero on reopen', () => {
    const { hub, sources, flushDeferred } = setup();
    const off = hub.subscribe('p1', () => undefined);
    sources[0]?.send(files(5));
    off();
    flushDeferred();
    expect(sources[0]?.closed).toBe(true);
    expect(hub.openCount()).toBe(0);
    hub.subscribe('p1', () => undefined);
    expect(sources).toHaveLength(2);
    expect(sources[1]?.after).toBe(0);
  });

  it('keeps projects apart', () => {
    const { hub, sources } = setup();
    const seen: string[] = [];
    hub.subscribe('p1', (e) => seen.push(`p1:${e.seq}`));
    hub.subscribe('p2', (e) => seen.push(`p2:${e.seq}`));
    expect(sources.map((s) => s.projectId)).toEqual(['p1', 'p2']);
    sources[1]?.send(files(1));
    expect(seen).toEqual(['p2:1']);
  });

  it('does not reconnect a closed channel', () => {
    const { hub, sources, timers, flushDeferred } = setup();
    const off = hub.subscribe('p1', () => undefined);
    off();
    flushDeferred();
    sources[0]?.fail();
    expect(timers).toHaveLength(0);
  });
});
