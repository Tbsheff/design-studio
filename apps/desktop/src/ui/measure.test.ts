import { describe, expect, it } from "vitest";

import { formatMeasure, measureBetween } from "../shared/measure";

describe(measureBetween, () => {
  it("measures the gap to a sibling on the right and below", () => {
    expect.hasAssertions();

    expect(
      measureBetween(
        { height: 50, width: 100, x: 0, y: 0 },
        { height: 20, width: 40, x: 124, y: 10 }
      )
    ).toStrictEqual([{ at: 20, axis: "x", from: 100, to: 124, value: 24 }]);
    expect(
      measureBetween(
        { height: 50, width: 100, x: 0, y: 0 },
        { height: 20, width: 100, x: 0, y: 66 }
      )
    ).toStrictEqual([{ at: 50, axis: "y", from: 50, to: 66, value: 16 }]);
  }, 0);

  it("measures four insets to a parent", () => {
    expect.hasAssertions();

    const lines = measureBetween(
      { height: 30, width: 30, x: 10, y: 20 },
      { height: 100, width: 100, x: 0, y: 0 }
    );

    expect(lines.map((line) => line.value)).toStrictEqual([20, 50, 10, 60]);
  }, 0);

  it("formats with at most one decimal", () => {
    expect.hasAssertions();

    expect(formatMeasure(16)).toBe("16");
    expect(formatMeasure(12.345)).toBe("12.3");
  }, 0);
});
