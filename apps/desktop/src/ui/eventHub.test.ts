import type { StudioEvent } from "@design-studio/contracts";
import { describe, expect, it } from "vitest";

import { createEventHub } from "./platform/event-hub";
import type { EventHub, EventSourceLike } from "./platform/event-hub";

const EXPECTED_7 = 7;
const FILES_ARG_3 = 3;
const FILES_ARG_4 = 4;
const FILES_ARG_5 = 5;
const FILES_ARG_7 = 7;
const SAMPLE_3 = 3;
const SAMPLE_4 = 4;

const IS_FALSE = false;
const IS_TRUE = true;

class FakeSource implements EventSourceLike {
  public onopen: EventSourceLike["onopen"] = null;
  public onmessage: EventSourceLike["onmessage"] = null;
  public onerror: EventSourceLike["onerror"] = null;
  public closed = false;
  public listeners = new Map<string, EventListener[]>();
  public readonly projectId: string;
  public readonly after: number;

  public constructor(projectId: string, after: number) {
    this.projectId = projectId;
    this.after = after;
  }

  public addEventListener(type: string, listener: EventListener): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  public close(): void {
    this.closed = true;
  }

  public open(): void {
    this.onopen?.(new Event("open"));
  }

  public fail(): void {
    this.onerror?.(new Event("error"));
  }

  public send(
    event: Partial<StudioEvent> & { type: string; seq: number }
  ): void {
    const message = new MessageEvent("message", {
      data: JSON.stringify(event),
    });

    for (const listener of this.listeners.get(event.type) ?? []) {
      listener(message);
    }
  }
}

const ignoreEvent = (): null => null;

interface HubSetup {
  flushDeferred: () => void;
  hub: EventHub;
  sources: FakeSource[];
  timers: (() => void)[];
}

const setup = (): HubSetup => {
  const sources: FakeSource[] = [];
  const timers: (() => void)[] = [];
  const deferred: (() => void)[] = [];

  const hub = createEventHub({
    clearTimer: ignoreEvent,
    defer: (fn) => deferred.push(fn),
    open: (projectId, after) => {
      const source = new FakeSource(projectId, after);
      sources.push(source);

      return source;
    },
    setTimer: (fn) => timers.push(fn),
  });

  const flushDeferred = (): void => {
    for (const fn of deferred.splice(0)) {
      fn();
    }
  };

  return { flushDeferred, hub, sources, timers };
};

const files = (seq: number) => {
  const projectId = "p1";
  const ts = seq;

  return { projectId, seq, ts, type: "files.changed" } as const;
};

describe("event hub", () => {
  it("opens one connection per project for many subscribers", () => {
    expect.hasAssertions();

    const { hub, sources } = setup();
    const first: number[] = [];
    const second: number[] = [];
    hub.subscribe("p1", (event) => first.push(event.seq));
    hub.subscribe("p1", (event) => second.push(event.seq));
    hub.watchState("p1", ignoreEvent);
    expect(sources).toHaveLength(1);
    expect(sources[0]?.after).toBe(0);
    sources[0]?.send(files(1));
    sources[0]?.send(files(2));
    expect(first).toStrictEqual([1, 2]);
    expect(second).toStrictEqual([1, 2]);
  }, 0);

  it("drops events with a seq at or below the last one", () => {
    expect.hasAssertions();

    const { hub, sources } = setup();
    const seen: number[] = [];
    hub.subscribe("p1", (event) => seen.push(event.seq));
    sources[0]?.send(files(FILES_ARG_3));
    sources[0]?.send(files(FILES_ARG_3));
    sources[0]?.send(files(2));
    sources[0]?.send(files(FILES_ARG_4));
    expect(seen).toStrictEqual([SAMPLE_3, SAMPLE_4]);
  }, 0);

  it("reconnects after the last seq and reports the state", () => {
    expect.hasAssertions();

    const { hub, sources, timers } = setup();
    const states: string[] = [];
    hub.subscribe("p1", ignoreEvent);
    hub.watchState("p1", () => states.push(hub.state("p1")));
    sources[0]?.open();
    sources[0]?.send(files(FILES_ARG_7));
    sources[0]?.fail();
    expect(sources[0]?.closed).toBe(IS_TRUE);
    expect(hub.state("p1")).toBe("reconnecting");
    timers.shift()?.();
    expect(sources).toHaveLength(2);
    expect(sources[1]?.after).toBe(EXPECTED_7);
    sources[1]?.open();
    expect(states).toStrictEqual(["open", "reconnecting", "open"]);
  }, 0);

  it("keeps the connection through an unsubscribe and resubscribe in one task", () => {
    expect.hasAssertions();

    const { hub, sources, flushDeferred } = setup();
    const off = hub.subscribe("p1", ignoreEvent);
    off();
    hub.subscribe("p1", ignoreEvent);
    flushDeferred();
    expect(sources).toHaveLength(1);
    expect(sources[0]?.closed).toBe(IS_FALSE);
  }, 0);
});

describe("event hub lifecycle", () => {
  it("closes when the last subscriber leaves and replays from zero on reopen", () => {
    expect.hasAssertions();

    const { hub, sources, flushDeferred } = setup();
    const off = hub.subscribe("p1", ignoreEvent);
    sources[0]?.send(files(FILES_ARG_5));
    off();
    flushDeferred();
    expect(sources[0]?.closed).toBe(IS_TRUE);
    expect(hub.openCount()).toBe(0);
    hub.subscribe("p1", ignoreEvent);
    expect(sources).toHaveLength(2);
    expect(sources[1]?.after).toBe(0);
  }, 0);

  it("keeps projects apart", () => {
    expect.hasAssertions();

    const { hub, sources } = setup();
    const seen: string[] = [];
    hub.subscribe("p1", (event) => seen.push(`p1:${event.seq}`));
    hub.subscribe("p2", (event) => seen.push(`p2:${event.seq}`));
    expect(sources.map((source) => source.projectId)).toStrictEqual([
      "p1",
      "p2",
    ]);
    sources[1]?.send(files(1));
    expect(seen).toStrictEqual(["p2:1"]);
  }, 0);

  it("does not reconnect a closed channel", () => {
    expect.hasAssertions();

    const { hub, sources, timers, flushDeferred } = setup();
    const off = hub.subscribe("p1", ignoreEvent);
    off();
    flushDeferred();
    sources[0]?.fail();
    expect(timers).toHaveLength(0);
  }, 0);
});
