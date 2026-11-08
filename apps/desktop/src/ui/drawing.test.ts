import { describe, expect, it } from "vitest";

import { agentText, strokesBox } from "../shared/comments";
import {
  createStrokeBuilder,
  minStepFor,
  strokePath,
} from "./features/canvas/drawing-model";

const EXPECTED_4 = 4;
const SAMPLE_0_2 = 0.2;
const SAMPLE_0_5 = 0.5;
const SAMPLE_10 = 10;
const SAMPLE_100 = 100;
const SAMPLE_110 = 110;
const SAMPLE_20 = 20;
const SAMPLE_4 = 4;
const SAMPLE_70 = 70;
const SAMPLE_NEG_2 = -2;
const SAMPLE_NEG_4 = -4;

const IS_FALSE = false;

describe("drawing strokes", () => {
  it("smooths jitter, drops tiny steps, and ends at the pointer", () => {
    expect.hasAssertions();

    const builder = createStrokeBuilder(0, 0, minStepFor(1));
    expect(builder.add(SAMPLE_0_5, SAMPLE_0_2)).toBe(IS_FALSE);

    for (let offset = 10; offset <= SAMPLE_100; offset += SAMPLE_10) {
      builder.add(offset, offset % SAMPLE_20 === 0 ? SAMPLE_4 : SAMPLE_NEG_4);
    }

    builder.end(SAMPLE_100, 0);
    const points = builder.points();
    const ys = points.filter((_unusedItem, index) => index % 2 === 1);
    expect(Math.max(...ys.map(Math.abs))).toBeLessThan(EXPECTED_4);
    expect(points.slice(SAMPLE_NEG_2)).toStrictEqual([SAMPLE_100, 0]);
  }, 0);

  it("draws a smooth path with quadratic segments", () => {
    expect.hasAssertions();

    expect(strokePath([0, 0])).toBe("M0 0l0.01 0");
    expect(strokePath([0, 0, SAMPLE_10, 0, SAMPLE_20, SAMPLE_10])).toBe(
      "M0 0Q10 0 15 5L20 10"
    );
  }, 0);

  it("measures the stroke box with the pen width", () => {
    expect.hasAssertions();

    expect(strokesBox([])).toBeNull();
    expect(
      strokesBox([
        {
          color: "#ff3b30",
          points: [SAMPLE_10, SAMPLE_20, SAMPLE_110, SAMPLE_70],
          width: 4,
        },
      ])
    ).toStrictEqual({ height: 54, width: 104, x: 8, y: 18 });
  }, 0);

  it("puts replies in the text for the agent", () => {
    expect.hasAssertions();

    expect(agentText({ replies: [], text: "Red" })).toBe("Red");
    expect(
      agentText({
        replies: [{ createdAt: 1, id: "a", text: "darker\n red" }],
        text: "Red",
      })
    ).toBe("Red\nReplies:\n- darker red");
  }, 0);
});
