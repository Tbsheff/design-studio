import type { RunSummary, StudioEvent } from "@design-studio/contracts";
import { describe, expect, it } from "vitest";

import { applyRunEvent, runText } from "./features/chat/run-state-model";
import type { RunMap } from "./features/chat/run-state-model";
import {
  createDeltaBatcher,
  mergeDeltas,
} from "./features/inspector/delta-batch";

let seq = 0;

const base = () => ({
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
    id: runId,
    projectId: "p1",
    directionId: "d1",
    request: { prompt: "x", mode: "edit" },
    status: "completed",
    startedAt: 1,
    finishedAt: 2,
    finalText,
    toolCalls: [],
  } as unknown as RunSummary,
  type: "run.finished",
});

function harness() {
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

      return () => {
        live = false;
      };
    }
  );

  return {
    batcher,
    frame: () => {
      for (const fn of queued.splice(0)) {
        fn();
      }
    },
    runs: () => runs,
    updates: () => updates,
  };
}

function direct(events: StudioEvent[]): RunMap {
  return events.reduce(applyRunEvent, {} as RunMap);
}

describe("delta batcher", () => {
  it("applies many deltas in one update per frame", () => {
    const h = harness();
    h.batcher.push(started("r1"));

    for (const word of ["a ", "b ", "c ", "d"]) {
      h.batcher.push(delta("r1", word));
    }

    expect(h.updates()).toBe(1);
    h.frame();
    expect(h.updates()).toBe(2);
    expect(runText(h.runs().r1!)).toBe("a b c d");
  });

  it("flushes pending deltas before a non-delta run event so order holds", () => {
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
    expect(h.runs()).toEqual(direct(events));
  });

  it("gives the same text for small and big chunks", () => {
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
  });

  it("keeps interleaved runs apart", () => {
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
  });

  it("skips updates for non-run events when nothing is pending", () => {
    const h = harness();
    h.batcher.push({
      ...base(),
      changedAt: 1,
      directionId: "d1",
      paths: ["a.html"],
      type: "files.changed",
    });
    expect(h.updates()).toBe(0);
  });

  it("drops pending deltas on dispose", () => {
    const h = harness();
    h.batcher.push(delta("r1", "a"));
    h.batcher.dispose();
    h.frame();
    expect(h.updates()).toBe(0);
  });

  it("merges only adjacent deltas of the same run", () => {
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
    ).toEqual(["a", "b", "c"]);
    expect(mergeDeltas([a], c).map((e) => e.text)).toEqual(["ac"]);
  });
});
