import type { RunRequest, RunSummary } from "@design-studio/contracts";
import { describe, expect, it } from "vitest";

import {
  improvePassed,
  improveRequest,
  lastImproveRun,
} from "./draft-improve.js";
import { emptyRun } from "./run-state-model.js";
import type { RunView } from "./run-state-model.js";

const DESIGN_SYSTEM = "design-system";
const THIRD_ROUND = 3;

const toRequest = (task: typeof DESIGN_SYSTEM | null): RunRequest => {
  if (task) {
    return { mode: "edit", prompt: "x", task };
  }

  return { mode: "edit", prompt: "x" };
};

const view = (
  task: typeof DESIGN_SYSTEM | null,
  summary: Partial<RunSummary> | null = null,
  startedAt = 1
): RunView => ({
  ...emptyRun(`r${startedAt}`, "main", startedAt, toRequest(task)),
  status: summary?.status ?? "running",
  summary: summary as RunSummary | null,
});

describe("improve with AI", () => {
  it(
    "builds a design-system run with the optional focus and never a wireframe level",
    { timeout: 5000 },
    () => {
      expect.hasAssertions();

      expect(improveRequest("  ", "prototype")).toStrictEqual({
        level: "prototype",
        mode: "edit",
        prompt: "Improve this design system.",
        task: DESIGN_SYSTEM,
      });
      expect(improveRequest("Warmer neutrals", "wireframe")).toStrictEqual({
        level: "prototype",
        mode: "edit",
        prompt: "Improve this design system.\n\nFocus: Warmer neutrals",
        task: DESIGN_SYSTEM,
      });
      expect(improveRequest("", "polish").level).toBe("polish");
    }
  );

  it(
    "finds the latest improve run and says whether it passed",
    { timeout: 5000 },
    () => {
      expect.hasAssertions();

      const passed = view(
        DESIGN_SYSTEM,
        {
          designSystemCheck: { passed: true, problems: [], rounds: 0 },
          status: "completed",
        },
        1
      );

      const later = view(null, { status: "completed" }, 2);
      expect(lastImproveRun([passed, later])).toBe(passed);
      expect([improvePassed(passed)]).toStrictEqual([true]);

      const failed = view(
        DESIGN_SYSTEM,
        {
          designSystemCheck: {
            passed: false,
            problems: [{ message: "x", rule: "fonts" }],
            rounds: THIRD_ROUND,
          },
          status: "failed",
        },
        THIRD_ROUND
      );

      expect(lastImproveRun([passed, later, failed])).toBe(failed);
      expect([improvePassed(failed)]).toStrictEqual([false]);
      expect([improvePassed(null)]).toStrictEqual([false]);
    }
  );
});
