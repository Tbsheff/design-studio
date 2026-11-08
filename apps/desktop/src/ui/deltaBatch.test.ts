import type { RunSummary, StudioEvent } from "@design-studio/contracts";
import { describe, expect, it } from "vitest";

import { applyRunEvent, runText } from "./features/chat/run-state-model";
import type { RunMap } from "./features/chat/run-state-model";
import {
  createDeltaBatcher,
  mergeDeltas,
} from "./features/inspector/delta-batch";
import type { DeltaBatcher } from "./features/inspector/delta-batch";

let seq = 0;

interface BaseEvent {
  directionId: string;
  projectId: string;
  seq: number;
  ts: number;
}

const base = (): BaseEvent => ({
  directionId: "d1",
  projectId: "p1",
  seq: ++seq,
  ts: 1000 + seq,
});

const delta = (runId: string, text: string): StudioEvent => ({
  ...base(),
  runId,
  text,
  type: "run.text.delta",
});

const block = (runId: string, text: string): StudioEvent => ({
  ...base(),
  runId,
  text,
  type: "run.text",
});

const started = (runId: string): StudioEvent => ({
  ...base(),
  request: { mode: "edit", prompt: "x" },
  runId,
  type: "run.started",
});

const finished = (runId: string, finalText: string): StudioEvent => ({
  ...base(),
  runId,
  summary: {
    directionId: "d1",
    finalText,
    finishedAt: 2,
    id: runId,
    projectId: "p1",
    request: { mode: "edit", prompt: "x" },
    startedAt: 1,
    status: "completed",
    toolCalls: [],
  } as unknown as RunSummary,
  type: "run.finished",
});

interface Harness {
  batcher: DeltaBatcher;
  frame: () => void;
  runs: () => RunMap;
  updates: () => number;
}

function harness(): Harness {
  let runs: RunMap = {};
  let updates = 0;
  const queued: (() => void)[] = [];

  const batcher = createDeltaBatcher(
    (fn) => {
      updates += 1;
      runs = fn(runs);
    },
    (fn) => {
      let live = true;
      queued.push(() => live && fn());

      return (): void => {
        live = false;
      };
    }
  );

  return {
    batcher,
    frame: (): void => {
      for (const fn of queued.splice(0)) {
        fn();
      }
    },
    runs: (): RunMap => runs,
    updates: (): number => updates,
  };
}

function direct(events: StudioEvent[]): RunMap {
  return events.reduce(applyRunEvent, {} as RunMap);
}

describe("delta batcher", () => {
  it("applies many deltas in one update per frame", () => {
    expect.hasAssertions();

    const h = harness();
    h.batcher.push(started("r1"));

    for (const word of ["a ", "b ", "c ", "d"]) {
      h.batcher.push(delta("r1", word));
    }

    expect(h.updates()).toBe(1);
    h.frame();
    expect(h.updates()).toBe(2);
    expect(runText(h.runs().r1!)).toBe("a b c d");
  }, 0);

  it("flushes pending deltas before a non-delta run event so order holds", () => {
    expect.hasAssertions();

    const events = [
      started("r1"),
      delta("r1", "Hel"),
      delta("r1", "lo"),
      block("r1", "Hello"),
      delta("r1", "Wor"),
      delta("r1", "ld"),
      block("r1", "World"),
      finished("r1", "Hello\n\nWorld"),
    ];

    const h = harness();

    for (const event of events) {
      h.batcher.push(event);
    }

    h.frame();
    expect(h.runs()).toStrictEqual(direct(events));
  }, 0);

  it("gives the same text for small and big chunks", () => {
    expect.hasAssertions();

    const text = "one two three four five six seven eight nine ten";
    const small = text.split(/(?<= )/).map((part) => delta("r1", part));
    const big = [delta("r1", text.slice(0, 20)), delta("r1", text.slice(20))];

    for (const chunks of [small, big]) {
      const h = harness();
      h.batcher.push(started("r1"));

      for (const event of chunks) {
        h.batcher.push(event);
      }

      h.frame();
      expect(runText(h.runs().r1!)).toBe(text);
    }
  }, 0);

  it("keeps interleaved runs apart", () => {
    expect.hasAssertions();

    const events = [
      started("r1"),
      started("r2"),
      delta("r1", "a"),
      delta("r2", "x"),
      delta("r1", "b"),
      delta("r2", "y"),
    ];

    const h = harness();

    for (const event of events) {
      h.batcher.push(event);
    }

    h.frame();
    expect(runText(h.runs().r1!)).toBe("ab");
    expect(runText(h.runs().r2!)).toBe("xy");
  }, 0);

  it("skips updates for non-run events when nothing is pending", () => {
    expect.hasAssertions();

    const h = harness();
    h.batcher.push({
      ...base(),
      changedAt: 1,
      directionId: "d1",
      paths: ["a.html"],
      type: "files.changed",
    });
    expect(h.updates()).toBe(0);
  }, 0);

  it("drops pending deltas on dispose", () => {
    expect.hasAssertions();

    const h = harness();
    h.batcher.push(delta("r1", "a"));
    h.batcher.dispose();
    h.frame();
    expect(h.updates()).toBe(0);
  }, 0);

  it("merges only adjacent deltas of the same run", () => {
    expect.hasAssertions();

    const a = delta("r1", "a") as Extract<
      StudioEvent,
      { type: "run.text.delta" }
    >;

    const b = delta("r2", "b") as Extract<
      StudioEvent,
      { type: "run.text.delta" }
    >;

    const c = delta("r1", "c") as Extract<
      StudioEvent,
      { type: "run.text.delta" }
    >;

    expect(
      mergeDeltas(mergeDeltas(mergeDeltas([], a), b), c).map((e) => e.text)
    ).toStrictEqual(["a", "b", "c"]);
    expect(mergeDeltas([a], c).map((e) => e.text)).toStrictEqual(["ac"]);
  }, 0);
});
