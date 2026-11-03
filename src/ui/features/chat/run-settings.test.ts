import { describe, expect, it } from "vitest";

import { createDraftStore, homeVariations } from "../../platform/storage.js";
import { nextRadioOption } from "./level-control.js";
import { designsHint, runSettingsSummary } from "./run-settings.js";

describe(nextRadioOption, () => {
  const options = [1, 2, 3, 4] as const;

  it("moves with arrows, wraps, and jumps with Home and End", () => {
    expect.hasAssertions();
    expect(nextRadioOption(options, 1, "ArrowRight")).toBe(2);
    expect(nextRadioOption(options, 4, "ArrowDown")).toBe(1);
    expect(nextRadioOption(options, 1, "ArrowLeft")).toBe(4);
    expect(nextRadioOption(options, 3, "Home")).toBe(1);
  }, 5000);

  it("jumps to the end and ignores other keys", () => {
    expect.hasAssertions();
    expect(nextRadioOption(options, 1, "End")).toBe(4);
    expect(nextRadioOption(options, 1, "Enter")).toBeNull();
  }, 5000);

  it("skips disabled options", () => {
    expect.hasAssertions();
    const overMax = (n: number) => n > 3;
    expect(nextRadioOption(options, 3, "ArrowRight", overMax)).toBe(1);
    expect(nextRadioOption(options, 1, "End", overMax)).toBe(3);
    expect(nextRadioOption(options, 1, "ArrowRight", () => true)).toBeNull();
  }, 5000);
});

describe("run settings summary", () => {
  it("always shows mode and level, and designs only when Send fans out", () => {
    expect.hasAssertions();
    expect(
      runSettingsSummary({ mode: "edit", level: "prototype", designs: 1 })
    ).toBe("Edit · Prototype");
    expect(
      runSettingsSummary({ mode: "edit", level: "prototype", designs: 3 })
    ).toBe("Edit · Prototype · 3 designs");
    expect(
      runSettingsSummary({
        mode: "critique",
        level: "polish",
        designs: 3,
        designsOn: false,
      })
    ).toBe("Critique · Polish");
    expect(runSettingsSummary({ level: "wireframe", designs: 2 })).toBe(
      "Wireframe · 2 designs"
    );
  }, 5000);

  it("shows why designs are off as visible text", () => {
    expect.hasAssertions();
    expect(
      designsHint({
        value: 3,
        max: 4,
        onChange: () => undefined,
        disabledReason: "Critique makes one review.",
      })
    ).toBe("Critique makes one review.");
    expect(
      designsHint({
        value: 1,
        max: 3,
        onChange: () => undefined,
        disabledReason: null,
      })
    ).toBe("Pick 2 to 3 to compare options.");
  }, 5000);
});

describe("draft store and Home handoff", () => {
  it("notifies only on change", () => {
    expect.hasAssertions();
    const store = createDraftStore();
    let calls = 0;
    store.subscribe(() => {
      calls += 1;
    });
    store.set("a");
    store.set("a");
    expect(store.get()).toBe("a");
    expect(calls).toBe(1);
  }, 5000);

  it("hands the Home variations intent to one project once", () => {
    expect.hasAssertions();
    homeVariations.set({
      projectId: "p1",
      prompt: "A page",
      count: 3,
      level: "prototype",
    });
    expect(homeVariations.take("p2")).toBeNull();
    expect(homeVariations.take("p1")?.count).toBe(3);
    expect(homeVariations.take("p1")).toBeNull();
  }, 5000);
});
