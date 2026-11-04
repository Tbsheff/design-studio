import { describe, expect, it } from "vitest";

import type { RunSummary } from "../../../shared/actions/_core/contracts.js";
import {
  improvePassed,
  improveRequest,
  lastImproveRun,
} from "./draft-improve.js";
import { emptyRun } from "./run-state-model.js";
import type { RunView } from "./run-state-model.js";

const view = (
  task: "design-system" | undefined,
  summary: Partial<RunSummary> | null = null,
  startedAt = 1
): RunView => ({
  ...emptyRun(`r${startedAt}`, "main", startedAt, {
    mode: "edit",
    prompt: "x",
    ...(task ? { task } : {}),
  }),
  status: summary?.status ?? "running",
  summary: summary as RunSummary | null,
});

describe("improve with AI", () => {
  it("builds a design-system run with the optional focus and never a wireframe level", () => {
    expect.hasAssertions();

    expect(improveRequest("  ", "prototype")).toStrictEqual({
      level: "prototype",
      mode: "edit",
      prompt: "Improve this design system.",
      task: "design-system",
    });
    expect(improveRequest("Warmer neutrals", "wireframe")).toStrictEqual({
      level: "prototype",
      mode: "edit",
      prompt: "Improve this design system.\n\nFocus: Warmer neutrals",
      task: "design-system",
    });
    expect(improveRequest("", "polish").level).toBe("polish");
  }, 5000);

  it("finds the latest improve run and says whether it passed", () => {
    expect.hasAssertions();

    const passed = view(
      "design-system",
      {
        designSystemCheck: { passed: true, problems: [], rounds: 0 },
        status: "completed",
      },
      1
    );

    const later = view(undefined, { status: "completed" }, 2);
    expect(lastImproveRun([passed, later])).toBe(passed);
    expect([improvePassed(passed)]).toStrictEqual([true]);

    const failed = view(
      "design-system",
      {
        designSystemCheck: {
          passed: false,
          problems: [{ message: "x", rule: "fonts" }],
          rounds: 3,
        },
        status: "failed",
      },
      3
    );

    expect(lastImproveRun([passed, later, failed])).toBe(failed);
    expect([improvePassed(failed)]).toStrictEqual([false]);
    expect([improvePassed(null)]).toStrictEqual([false]);
  }, 5000);
});
