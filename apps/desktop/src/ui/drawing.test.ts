import { describe, expect, it } from "vitest";

import { agentText, strokesBox } from "../shared/comments";
import {
  createStrokeBuilder,
  minStepFor,
  strokePath,
} from "./features/canvas/drawing-model";

const IS_FALSE = false;

describe("drawing strokes", () => {
  it("smooths jitter, drops tiny steps, and ends at the pointer", () => {
    expect.hasAssertions();

    const builder = createStrokeBuilder(0, 0, minStepFor(1));
    expect(builder.add(0.5, 0.2)).toBe(IS_FALSE);

    for (let offset = 10; offset <= 100; offset += 10) {
      builder.add(offset, offset % 20 === 0 ? 4 : -4);
    }

    builder.end(100, 0);
    const points = builder.points();
    const ys = points.filter((_unusedItem, index) => index % 2 === 1);
    expect(Math.max(...ys.map(Math.abs))).toBeLessThan(4);
    expect(points.slice(-2)).toStrictEqual([100, 0]);
  }, 0);

  it("draws a smooth path with quadratic segments", () => {
    expect.hasAssertions();

    expect(strokePath([0, 0])).toBe("M0 0l0.01 0");
    expect(strokePath([0, 0, 10, 0, 20, 10])).toBe("M0 0Q10 0 15 5L20 10");
  }, 0);

  it("measures the stroke box with the pen width", () => {
    expect.hasAssertions();

    expect(strokesBox([])).toBeNull();
    expect(
      strokesBox([{ color: "#ff3b30", points: [10, 20, 110, 70], width: 4 }])
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
