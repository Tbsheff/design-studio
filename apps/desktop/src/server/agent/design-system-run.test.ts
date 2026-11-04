import { describe, expect, it } from "vitest";

import type { DesignSystemCheckResult } from "../../shared/actions/_core/contracts.js";
import {
  designSystemContinuation,
  enforceDesignSystemCheck,
  MAX_DESIGN_SYSTEM_ROUNDS,
  wantsDesignSystemCheck,
} from "./design-system-run.js";
import { EMPTY_USAGE } from "./lifecycle.js";
import type { DriverOutcome } from "./lifecycle.js";

const PASS: DesignSystemCheckResult = { passed: true, problems: [] };

const FAIL: DesignSystemCheckResult = {
  passed: false,
  problems: [
    {
      message: "DESIGN.md still has a to-do line: _To do: x_",
      rule: "design-md",
    },
    {
      message: "--fg-muted on --bg in dark mode is 3.10:1; AA needs 4.5:1.",
      rule: "contrast",
    },
  ],
};

const outcome = (extra: Partial<DriverOutcome> = {}): DriverOutcome => ({
  costUsd: 0.1,
  durationMs: 10,
  error: null,
  finalText: "Done.",
  modelMs: 5,
  status: "completed",
  usage: { ...EMPTY_USAGE },
  ...extra,
});

function scripted(results: DesignSystemCheckResult[]) {
  let index = 0;

  return async () => results[Math.min(index++, results.length - 1)]!;
}

describe("design system run enforcement", () => {
  it("runs only for design-system tasks in edit mode in a backing project", () => {
    const project = { designSystemFor: "user-kit" };
    expect(
      wantsDesignSystemCheck({
        project,
        request: { mode: "edit", task: "design-system" },
      })
    ).toBe(true);
    expect(
      wantsDesignSystemCheck({
        project: { designSystemFor: null },
        request: { mode: "edit", task: "design-system" },
      })
    ).toBe(false);
    expect(wantsDesignSystemCheck({ project, request: { mode: "edit" } })).toBe(
      false
    );
    expect(
      wantsDesignSystemCheck({
        project,
        request: { mode: "critique", task: "design-system" },
      })
    ).toBe(false);
  });

  it("finishes done at once when the check passes", async () => {
    const texts: string[] = [];

    const result = await enforceDesignSystemCheck({
      check: scripted([PASS]),
      continueWith: async (text) => (texts.push(text), outcome()),
      first: outcome(),
      signal: new AbortController().signal,
      workTree: "/x",
    });

    expect(texts).toEqual([]);
    expect(result).toMatchObject({
      designSystemCheck: { passed: true, problems: [], rounds: 0 },
      status: "completed",
    });
    expect(result.finalText).toBe("Done.\n\nDesign system check: passed.");
  });

  it("fail, then retry with the problems, then pass", async () => {
    const texts: string[] = [];

    const result = await enforceDesignSystemCheck({
      check: scripted([FAIL, PASS]),
      continueWith: async (text, round, total) => (
        texts.push(`${round}:${text}`),
        { ...total, costUsd: total.costUsd + 0.05, finalText: "Fixed." }
      ),
      first: outcome(),
      signal: new AbortController().signal,
      workTree: "/x",
    });

    expect(texts).toHaveLength(1);
    expect(texts[0]).toMatch(
      /^1:<studio-continue>\nThe studio ran mcp__studio__design_system_check and it failed with 2 problem\(s\)\. Fix round 1 of 3\./
    );
    expect(texts[0]).toContain(
      "- [contrast] --fg-muted on --bg in dark mode is 3.10:1; AA needs 4.5:1."
    );
    expect(result.status).toBe("completed");
    expect(result.costUsd).toBeCloseTo(0.15, 9);
    expect(result.designSystemCheck).toEqual({
      passed: true,
      problems: [],
      rounds: 1,
    });
    expect(result.finalText).toBe(
      "Fixed.\n\nDesign system check: passed after 1 studio fix round(s)."
    );
  });

  it("fail on every round, then stop after the max rounds with a clear failed status", async () => {
    let rounds = 0;

    const result = await enforceDesignSystemCheck({
      check: scripted([FAIL]),
      continueWith: async (_text, _round, total) => (rounds++, total),
      first: outcome(),
      signal: new AbortController().signal,
      workTree: "/x",
    });

    expect(rounds).toBe(MAX_DESIGN_SYSTEM_ROUNDS);
    expect(result.status).toBe("failed");
    expect(result.error).toBe(
      `Design system check failed: 2 problem(s) after ${MAX_DESIGN_SYSTEM_ROUNDS} fix round(s). DESIGN.md still has a to-do line: _To do: x_ --fg-muted on --bg in dark mode is 3.10:1; AA needs 4.5:1.`
    );
    expect(result.designSystemCheck).toMatchObject({
      passed: false,
      rounds: MAX_DESIGN_SYSTEM_ROUNDS,
    });
    expect(result.finalText).toContain(
      "Design system check: failed after 3 studio fix round(s), 2 problem(s) left"
    );
  });

  it("fails when the session cannot continue, keeps a non-completed status, and stops on cancel", async () => {
    const noSession = await enforceDesignSystemCheck({
      check: scripted([FAIL]),
      continueWith: async () => null,
      first: outcome(),
      signal: new AbortController().signal,
      workTree: "/x",
    });

    expect(noSession).toMatchObject({
      designSystemCheck: { rounds: 0 },
      status: "failed",
    });

    const budget = await enforceDesignSystemCheck({
      check: scripted([FAIL]),
      continueWith: async () => outcome(),
      first: outcome({ status: "budget_exceeded", error: "budget" }),
      signal: new AbortController().signal,
      workTree: "/x",
    });

    expect(budget).toMatchObject({
      designSystemCheck: { passed: false, rounds: 0 },
      error: "budget",
      status: "budget_exceeded",
    });
    const controller = new AbortController();
    controller.abort();

    const canceled = await enforceDesignSystemCheck({
      check: scripted([FAIL]),
      continueWith: async () => outcome(),
      first: outcome(),
      signal: controller.signal,
      workTree: "/x",
    });

    expect(canceled.designSystemCheck).toBeUndefined();
  });

  it("lists at most 20 problems in the continuation", () => {
    const many: DesignSystemCheckResult = {
      passed: false,
      problems: Array.from({ length: 30 }, (_v, index) => ({
        message: `problem ${index}`,
        rule: "tokens" as const,
      })),
    };

    const text = designSystemContinuation(many, 2, 3);
    expect(
      text.split("\n").filter((line) => line.startsWith("- [tokens]"))
    ).toHaveLength(20);
    expect(text).toContain("Fix round 2 of 3.");
  });
});
