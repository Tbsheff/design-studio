import { describe, expect, it } from "vitest";

import { createDraftStore, homeVariations } from "../../platform/storage.js";
import { nextRadioOption } from "./radio-nav-model.js";
import { designsHint, runSettingsSummary } from "./run-settings.js";

const VARIATIONS = 3;

describe(nextRadioOption, () => {
  const FIRST = 1;
  const SECOND = 2;
  const THIRD = 3;
  const FOURTH = 4;
  const options = [FIRST, SECOND, THIRD, FOURTH] as const;

  it(
    "moves with arrows, wraps, and jumps with Home and End",
    { timeout: 5000 },
    () => {
      expect.hasAssertions();
      expect(nextRadioOption(options, FIRST, "ArrowRight")).toBe(SECOND);
      expect(nextRadioOption(options, FOURTH, "ArrowDown")).toBe(FIRST);
      expect(nextRadioOption(options, FIRST, "ArrowLeft")).toBe(FOURTH);
      expect(nextRadioOption(options, THIRD, "Home")).toBe(FIRST);
    }
  );

  it("jumps to the end and ignores other keys", { timeout: 5000 }, () => {
    expect.hasAssertions();
    expect(nextRadioOption(options, FIRST, "End")).toBe(FOURTH);
    expect(nextRadioOption(options, FIRST, "Enter")).toBeNull();
  });

  it("skips disabled options", { timeout: 5000 }, () => {
    expect.hasAssertions();
    const overMax = (option: number): boolean => option > THIRD;
    expect(nextRadioOption(options, THIRD, "ArrowRight", overMax)).toBe(FIRST);
    expect(nextRadioOption(options, FIRST, "End", overMax)).toBe(THIRD);
    expect(
      nextRadioOption(options, FIRST, "ArrowRight", () => true)
    ).toBeNull();
  });
});

describe("run settings summary", () => {
  it(
    "always shows mode and level, and designs only when Send fans out",
    { timeout: 5000 },
    () => {
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
    }
  );

  it("shows why designs are off as visible text", { timeout: 5000 }, () => {
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
  });
});

describe("draft store and Home handoff", () => {
  it("notifies only on change", { timeout: 5000 }, () => {
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
  });

  it(
    "hands the Home variations intent to one project once",
    { timeout: 5000 },
    () => {
      expect.hasAssertions();
      homeVariations.set({
        count: VARIATIONS,
        level: "prototype",
        projectId: "p1",
        prompt: "A page",
      });
      expect(homeVariations.take("p2")).toBeNull();
      expect(homeVariations.take("p1")?.count).toBe(VARIATIONS);
      expect(homeVariations.take("p1")).toBeNull();
    }
  );
});
