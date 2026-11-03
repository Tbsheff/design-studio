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
      runSettingsSummary({ designs: 1, level: "prototype", mode: "edit" })
    ).toBe("Edit · Prototype");
    expect(
      runSettingsSummary({ designs: 3, level: "prototype", mode: "edit" })
    ).toBe("Edit · Prototype · 3 designs");
    expect(
      runSettingsSummary({
        designs: 3,
        designsOn: false,
        level: "polish",
        mode: "critique",
      })
    ).toBe("Critique · Polish");
    expect(runSettingsSummary({ designs: 2, level: "wireframe" })).toBe(
      "Wireframe · 2 designs"
    );
  }, 5000);

  it("shows why designs are off as visible text", () => {
    expect.hasAssertions();
    expect(
      designsHint({
        disabledReason: "Critique makes one review.",
        max: 4,
        onChange: () => null,
        value: 3,
      })
    ).toBe("Critique makes one review.");
    expect(
      designsHint({
        disabledReason: null,
        max: 3,
        onChange: () => null,
        value: 1,
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
      count: 3,
      level: "prototype",
      projectId: "p1",
      prompt: "A page",
    });
    expect(homeVariations.take("p2")).toBeNull();
    expect(homeVariations.take("p1")?.count).toBe(3);
    expect(homeVariations.take("p1")).toBeNull();
  }, 5000);
});
