import type { RunSummary, StudioEvent } from "@design-studio/contracts";
import { describe, expect, it } from "vitest";

import { applyRunEvent, runText } from "./features/chat/run-state-model";
import type { RunMap } from "./features/chat/run-state-model";
import {
  createDeltaBatcher,
  mergeDeltas,
} from "./features/inspector/delta-batch";
import type { DeltaBatcher } from "./features/inspector/delta-batch";

const SAMPLE_20 = 20;
const TS_1000 = 1000;

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
  ts: TS_1000 + seq,
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

    const fixture = harness();
    fixture.batcher.push(started("r1"));

    for (const word of ["a ", "b ", "c ", "d"]) {
      fixture.batcher.push(delta("r1", word));
    }

    expect(fixture.updates()).toBe(1);
    fixture.frame();
    expect(fixture.updates()).toBe(2);
    expect(runText(fixture.runs().r1!)).toBe("a b c d");
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

    const fixture = harness();

    for (const event of events) {
      fixture.batcher.push(event);
    }

    fixture.frame();
    expect(fixture.runs()).toStrictEqual(direct(events));
  }, 0);

  it("gives the same text for small and big chunks", () => {
    expect.hasAssertions();

    const text = "one two three four five six seven eight nine ten";
    const small = text.split(/(?<= )/).map((part) => delta("r1", part));
    const big = [
      delta("r1", text.slice(0, SAMPLE_20)),
      delta("r1", text.slice(SAMPLE_20)),
    ];

    for (const chunks of [small, big]) {
      const fixture = harness();
      fixture.batcher.push(started("r1"));

      for (const event of chunks) {
        fixture.batcher.push(event);
      }

      fixture.frame();
      expect(runText(fixture.runs().r1!)).toBe(text);
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

    const fixture = harness();

    for (const event of events) {
      fixture.batcher.push(event);
    }

    fixture.frame();
    expect(runText(fixture.runs().r1!)).toBe("ab");
    expect(runText(fixture.runs().r2!)).toBe("xy");
  }, 0);

  it("skips updates for non-run events when nothing is pending", () => {
    expect.hasAssertions();

    const fixture = harness();
    fixture.batcher.push({
      ...base(),
      changedAt: 1,
      directionId: "d1",
      paths: ["a.html"],
      type: "files.changed",
    });
    expect(fixture.updates()).toBe(0);
  }, 0);

  it("drops pending deltas on dispose", () => {
    expect.hasAssertions();

    const fixture = harness();
    fixture.batcher.push(delta("r1", "a"));
    fixture.batcher.dispose();
    fixture.frame();
    expect(fixture.updates()).toBe(0);
  }, 0);

  it("merges only adjacent deltas of the same run", () => {
    expect.hasAssertions();

    const first = delta("r1", "a") as Extract<
      StudioEvent,
      { type: "run.text.delta" }
    >;

    const second = delta("r2", "b") as Extract<
      StudioEvent,
      { type: "run.text.delta" }
    >;

    const third = delta("r1", "c") as Extract<
      StudioEvent,
      { type: "run.text.delta" }
    >;

    expect(
      mergeDeltas(mergeDeltas(mergeDeltas([], first), second), third).map(
        (merged) => merged.text
      )
    ).toStrictEqual(["a", "b", "c"]);
    expect(
      mergeDeltas([first], third).map((merged) => merged.text)
    ).toStrictEqual(["ac"]);
  }, 0);
});
