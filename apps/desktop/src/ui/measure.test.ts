import { describe, expect, it } from "vitest";

import { formatMeasure, measureBetween } from "../shared/measure";

const xAxis = "x";
const yAxis = "y";

const FORMAT_MEASURE_ARG_12_345 = 12.345;
const FORMAT_MEASURE_ARG_16 = 16;
const SAMPLE_10 = 10;
const SAMPLE_20 = 20;
const SAMPLE_50 = 50;
const SAMPLE_60 = 60;

describe(measureBetween, () => {
  it("measures the gap to a sibling on the right and below", () => {
    expect.hasAssertions();

    expect(
      measureBetween(
        { height: 50, width: 100, [xAxis]: 0, [yAxis]: 0 },
        { height: 20, width: 40, [xAxis]: 124, [yAxis]: 10 }
      )
    ).toStrictEqual([{ at: 20, axis: "x", from: 100, to: 124, value: 24 }]);
    expect(
      measureBetween(
        { height: 50, width: 100, [xAxis]: 0, [yAxis]: 0 },
        { height: 20, width: 100, [xAxis]: 0, [yAxis]: 66 }
      )
    ).toStrictEqual([{ at: 50, axis: "y", from: 50, to: 66, value: 16 }]);
  }, 0);

  it("measures four insets to a parent", () => {
    expect.hasAssertions();

    const lines = measureBetween(
      { height: 30, width: 30, [xAxis]: 10, [yAxis]: 20 },
      { height: 100, width: 100, [xAxis]: 0, [yAxis]: 0 }
    );

    expect(lines.map((line) => line.value)).toStrictEqual([
      SAMPLE_20,
      SAMPLE_50,
      SAMPLE_10,
      SAMPLE_60,
    ]);
  }, 0);

  it("formats with at most one decimal", () => {
    expect.hasAssertions();

    expect(formatMeasure(FORMAT_MEASURE_ARG_16)).toBe("16");
    expect(formatMeasure(FORMAT_MEASURE_ARG_12_345)).toBe("12.3");
  }, 0);
});
