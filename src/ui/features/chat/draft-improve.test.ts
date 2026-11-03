import { describe, expect, it } from "vitest";

import type { RunSummary } from "../../../shared/contracts.js";
import {
  improvePassed,
  improveRequest,
  lastImproveRun,
} from "./draft-improve.js";
import { emptyRun, type RunView } from "./run-state-model.js";

const view = (
  task: "design-system" | undefined,
  summary: Partial<RunSummary> | null = null,
  startedAt = 1
): RunView => ({
  ...emptyRun(`r${startedAt}`, "main", startedAt, {
    prompt: "x",
    mode: "edit",
    ...(task ? { task } : {}),
  }),
  status: summary?.status ?? "running",
  summary: summary as RunSummary | null,
});

describe("improve with AI", () => {
  it("builds a design-system run with the optional focus and never a wireframe level", () => {
    expect.hasAssertions();

    expect(improveRequest("  ", "prototype")).toStrictEqual({
      prompt: "Improve this design system.",
      mode: "edit",
      task: "design-system",
      level: "prototype",
    });
    expect(improveRequest("Warmer neutrals", "wireframe")).toStrictEqual({
      prompt: "Improve this design system.\n\nFocus: Warmer neutrals",
      mode: "edit",
      task: "design-system",
      level: "prototype",
    });
    expect(improveRequest("", "polish").level).toBe("polish");
  }, 5000);

  it("finds the latest improve run and says whether it passed", () => {
    expect.hasAssertions();

    const passed = view(
      "design-system",
      {
        status: "completed",
        designSystemCheck: { passed: true, problems: [], rounds: 0 },
      },
      1
    );
    const later = view(undefined, { status: "completed" }, 2);
    expect(lastImproveRun([passed, later])).toBe(passed);
    expect([improvePassed(passed)]).toStrictEqual([true]);
    const failed = view(
      "design-system",
      {
        status: "failed",
        designSystemCheck: {
          passed: false,
          problems: [{ rule: "fonts", message: "x" }],
          rounds: 3,
        },
      },
      3
    );
    expect(lastImproveRun([passed, later, failed])).toBe(failed);
    expect([improvePassed(failed)]).toStrictEqual([false]);
    expect([improvePassed(null)]).toStrictEqual([false]);
  }, 5000);
});
