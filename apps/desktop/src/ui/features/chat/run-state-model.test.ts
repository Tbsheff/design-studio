import { describe, expect, it } from "vitest";

import type { RunSummary, StudioEvent } from "@design-studio/actions/_core/contracts";
import {
  applyRunEvent,
  emptyRun,
  runFromSummary,
  runText,
  shownPending,
} from "./run-state-model.js";
import type { RunMap } from "./run-state-model.js";

const counter = { seq: 0 };

const ev = (body: Record<string, unknown>): StudioEvent =>
  ({
    directionId: "d",
    projectId: "p",
    runId: "r1",
    seq: ++counter.seq,
    ts: 1000 + counter.seq,
    ...body,
  }) as unknown as StudioEvent;

describe("run state", () => {
  it("keeps live thinking and order when the run finishes with an old summary", () => {
    expect.hasAssertions();

    const events = [
      ev({ request: { mode: "edit", prompt: "x" }, type: "run.started" }),
      ev({ text: "A", type: "run.thinking" }),
      ev({
        input: {},
        name: "Read",
        toolUseId: "t1",
        type: "run.tool.started",
      }),
      ev({
        durationMs: 5,
        isError: false,
        summary: "Read",
        toolUseId: "t1",
        type: "run.tool.finished",
      }),
      ev({ text: "B", type: "run.thinking" }),
      ev({ text: "Partial", type: "run.text.delta" }),
    ];

    const live = events.reduce(applyRunEvent, {} as RunMap);

    const summary = {
      directionId: "d",
      finalText: "",
      id: "r1",
      request: { mode: "edit", prompt: "x" },
      startedAt: 1,
      status: "canceled",
      toolCalls: [
        {
          finishedAt: 6,
          input: {},
          isError: false,
          name: "Read",
          startedAt: 1,
          toolUseId: "t1",
        },
      ],
    } as unknown as RunSummary;

    const done = applyRunEvent(live, ev({ summary, type: "run.finished" }));
    expect(done.r1?.parts).toStrictEqual([
      { kind: "thinking", text: "A" },
      { kind: "tool", toolUseId: "t1" },
      { kind: "thinking", text: "B" },
      { kind: "text", text: "Partial" },
    ]);
    expect(runText(done.r1!)).toBe("Partial");
  }, 5000);

  it("shows Stopped as soon as the stop is asked, and drops late stream events", () => {
    expect.hasAssertions();

    const live = [
      ev({ request: { mode: "edit", prompt: "x" }, type: "run.started" }),
      ev({ text: "Kept", type: "run.text.delta" }),
      ev({ items: [{ id: "q", text: "later" }], type: "run.queue" }),
      ev({ type: "run.stopping" }),
      ev({ text: " late", type: "run.text.delta" }),
      ev({
        input: {},
        name: "Read",
        toolUseId: "t9",
        type: "run.tool.started",
      }),
    ].reduce(applyRunEvent, {} as RunMap);

    expect(live.r1?.status).toBe("canceled");
    expect(live.r1?.queue).toStrictEqual([]);
    expect(runText(live.r1!)).toBe("Kept");
    expect(live.r1?.tools).toStrictEqual([]);
  }, 5000);

  it("keeps a run seeded as stopped stopped when run.started arrives late", () => {
    expect.hasAssertions();

    const seeded: RunMap = {
      r1: { ...emptyRun("r1", "d", 1), status: "canceled" },
    };

    const live = applyRunEvent(
      seeded,
      ev({ request: { mode: "edit", prompt: "x" }, type: "run.started" })
    );

    expect(live.r1?.status).toBe("canceled");
    expect(live.r1?.request?.prompt).toBe("x");
  }, 5000);
});

describe(shownPending, () => {
  const request = { mode: "edit" as const, prompt: "Make it blue" };
  const pending = emptyRun("pending-1", "main", 10_000, request);

  it("shows the pending send until a run with the same prompt starts in the direction", () => {
    expect.hasAssertions();
    expect(shownPending(pending, [], "main")).toBe(pending);
    expect(
      shownPending(pending, [emptyRun("old", "main", 2000, request)], "main")
    ).toBe(pending);
    expect(
      shownPending(
        pending,
        [emptyRun("other", "main", 10_050, { mode: "edit", prompt: "Other" })],
        "main"
      )
    ).toBe(pending);
    expect(
      shownPending(pending, [emptyRun("r1", "main", 10_050, request)], "main")
    ).toBeNull();
    expect(
      shownPending(pending, [emptyRun("r1", "main", 9500, request)], "main")
    ).toBeNull();
  }, 5000);

  it("hides the pending send in another direction or when there is none", () => {
    expect.hasAssertions();
    expect(shownPending(pending, [], "alt")).toBeNull();
    expect(shownPending(null, [], "main")).toBeNull();
  }, 5000);

  it("keeps a stored run title when a replayed run.finished has none", () => {
    expect.hasAssertions();

    const plain = {
      directionId: "d",
      finalText: "Done",
      id: "r9",
      request: { mode: "edit", prompt: "x" },
      startedAt: 1,
      status: "completed",
      toolCalls: [],
    } as unknown as RunSummary;

    const stored = runFromSummary({ ...plain, title: "Menu pass" });

    const replayed = applyRunEvent(
      { r9: stored },
      ev({ runId: "r9", summary: plain, type: "run.finished" })
    );

    expect(replayed.r9?.summary?.title).toBe("Menu pass");
    expect(
      applyRunEvent(
        {},
        ev({ runId: "r9", summary: plain, type: "run.finished" })
      ).r9?.summary?.title
    ).toBeUndefined();
  }, 5000);
});
