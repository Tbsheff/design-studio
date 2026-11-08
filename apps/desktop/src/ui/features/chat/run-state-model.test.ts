import type { RunSummary, StudioEvent } from "@design-studio/contracts";
import { describe, expect, it } from "vitest";

import {
  applyRunEvent,
  emptyRun,
  runFromSummary,
  runText,
  shownPending,
} from "./run-state-model.js";
import type { RunMap, RunView } from "./run-state-model.js";

const TS_BASE = 1000;
const NEAR_START = 10_000;
const NEAR_AFTER = 10_050;
const NEAR_BEFORE = 9500;
const OLD_START = 2000;
const TOOL_MS = 5;
const FINISHED_AT = 6;
const EDIT = "edit";
const MAIN = "main";
const RUN_ONE = "r1";
const RUN_STARTED = "run.started";
const RUN_FINISHED = "run.finished";
const TEXT_DELTA = "run.text.delta";
const TOOL_STARTED = "run.tool.started";
const TOOL_ONE = "t1";
const READ = "Read";
const PLAIN_PROMPT = "x";
const PLAIN_REQUEST = { mode: EDIT, prompt: PLAIN_PROMPT } as const;
const issued = new Set<number>();

const ev = (body: Record<string, unknown>): StudioEvent => {
  const seq = issued.size + 1;
  issued.add(seq);

  const event = {
    directionId: "d",
    projectId: "p",
    runId: RUN_ONE,
    seq,
    ts: TS_BASE + seq,
    ...body,
  };

  return event as unknown as StudioEvent;
};

const applyAll = (events: readonly StudioEvent[]): RunMap => {
  let runs: RunMap = {};

  for (const event of events) {
    runs = applyRunEvent(runs, event);
  }

  return runs;
};

const textOf = (run: RunView | undefined): string => {
  if (!run) {
    return "";
  }

  return runText(run);
};

const toSummary = (fields: Record<string, unknown>): RunSummary => {
  const summary = {
    directionId: "d",
    id: RUN_ONE,
    request: PLAIN_REQUEST,
    startedAt: 1,
    ...fields,
  };

  return summary as unknown as RunSummary;
};

describe("run state", () => {
  it(
    "keeps live thinking and order when the run finishes with an old summary",
    { timeout: 5000 },
    () => {
      expect.hasAssertions();

      const live = applyAll([
        ev({ request: PLAIN_REQUEST, type: RUN_STARTED }),
        ev({ text: "A", type: "run.thinking" }),
        ev({ input: {}, name: READ, toolUseId: TOOL_ONE, type: TOOL_STARTED }),
        ev({
          durationMs: TOOL_MS,
          isError: false,
          summary: READ,
          toolUseId: TOOL_ONE,
          type: "run.tool.finished",
        }),
        ev({ text: "B", type: "run.thinking" }),
        ev({ text: "Partial", type: TEXT_DELTA }),
      ]);

      const summary = toSummary({
        finalText: "",
        status: "canceled",
        toolCalls: [
          {
            finishedAt: FINISHED_AT,
            input: {},
            isError: false,
            name: READ,
            startedAt: 1,
            toolUseId: TOOL_ONE,
          },
        ],
      });

      const done = applyRunEvent(live, ev({ summary, type: RUN_FINISHED }));
      expect(done.r1?.parts).toStrictEqual([
        { kind: "thinking", text: "A" },
        { kind: "tool", toolUseId: TOOL_ONE },
        { kind: "thinking", text: "B" },
        { kind: "text", text: "Partial" },
      ]);
      expect(textOf(done.r1)).toBe("Partial");
    }
  );

  it(
    "shows Stopped as soon as the stop is asked, and drops late stream events",
    { timeout: 5000 },
    () => {
      expect.hasAssertions();

      const live = applyAll([
        ev({ request: PLAIN_REQUEST, type: RUN_STARTED }),
        ev({ text: "Kept", type: TEXT_DELTA }),
        ev({ items: [{ id: "q", text: "later" }], type: "run.queue" }),
        ev({ type: "run.stopping" }),
        ev({ text: " late", type: TEXT_DELTA }),
        ev({ input: {}, name: READ, toolUseId: "t9", type: TOOL_STARTED }),
      ]);

      expect(live.r1?.status).toBe("canceled");
      expect(live.r1?.queue).toStrictEqual([]);
      expect(textOf(live.r1)).toBe("Kept");
      expect(live.r1?.tools).toStrictEqual([]);
    }
  );

  it(
    "keeps a run seeded as stopped stopped when run.started arrives late",
    { timeout: 5000 },
    () => {
      expect.hasAssertions();

      const seeded: RunMap = {
        r1: { ...emptyRun(RUN_ONE, "d", 1), status: "canceled" },
      };

      const live = applyRunEvent(
        seeded,
        ev({ request: PLAIN_REQUEST, type: RUN_STARTED })
      );

      expect(live.r1?.status).toBe("canceled");
      expect(live.r1?.request?.prompt).toBe(PLAIN_PROMPT);
    }
  );
});

describe(shownPending, () => {
  const request = { mode: EDIT, prompt: "Make it blue" } as const;
  const pending = emptyRun("pending-1", MAIN, NEAR_START, request);

  it(
    "shows the pending send until a run with the same prompt starts in the direction",
    { timeout: 5000 },
    () => {
      expect.hasAssertions();
      expect(shownPending(pending, [], MAIN)).toBe(pending);
      expect(
        shownPending(pending, [emptyRun("old", MAIN, OLD_START, request)], MAIN)
      ).toBe(pending);
      expect(
        shownPending(
          pending,
          [
            emptyRun("other", MAIN, NEAR_AFTER, {
              mode: EDIT,
              prompt: "Other",
            }),
          ],
          MAIN
        )
      ).toBe(pending);
      expect(
        shownPending(
          pending,
          [emptyRun(RUN_ONE, MAIN, NEAR_AFTER, request)],
          MAIN
        )
      ).toBeNull();
      expect(
        shownPending(
          pending,
          [emptyRun(RUN_ONE, MAIN, NEAR_BEFORE, request)],
          MAIN
        )
      ).toBeNull();
    }
  );

  it(
    "hides the pending send in another direction or when there is none",
    { timeout: 5000 },
    () => {
      expect.hasAssertions();
      expect(shownPending(pending, [], "alt")).toBeNull();
      expect(shownPending(null, [], MAIN)).toBeNull();
    }
  );
});

describe(runFromSummary, () => {
  it(
    "keeps a stored run title when a replayed run.finished has none",
    { timeout: 5000 },
    () => {
      expect.hasAssertions();

      const plain = toSummary({
        finalText: "Done",
        id: "r9",
        status: "completed",
        toolCalls: [],
      });

      const stored = runFromSummary({ ...plain, title: "Menu pass" });

      const replayed = applyRunEvent(
        { r9: stored },
        ev({ runId: "r9", summary: plain, type: RUN_FINISHED })
      );

      expect(replayed.r9?.summary?.title).toBe("Menu pass");
      expect(
        applyRunEvent(
          {},
          ev({ runId: "r9", summary: plain, type: RUN_FINISHED })
        ).r9?.summary?.title
      ).toBeUndefined();
    }
  );
});
