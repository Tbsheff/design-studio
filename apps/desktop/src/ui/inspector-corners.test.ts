import { describe, expect, it } from "vitest";

import { toJoinedCorners } from "./features/inspector/index.js";

describe(toJoinedCorners, () => {
  it("writes four values in border-radius order", { timeout: 5000 }, () => {
    expect.hasAssertions();
    expect(
      toJoinedCorners({
        bottom: "12px",
        left: "16px",
        right: "8px",
        top: "4px",
      })
    ).toBe("4px 8px 12px 16px");
  });

  it("collapses equal corners to one value", { timeout: 5000 }, () => {
    expect.hasAssertions();
    expect(
      toJoinedCorners({ bottom: "8px", left: "8px", right: "8px", top: "8px" })
    ).toBe("8px");
    expect(
      toJoinedCorners({ bottom: "0", left: "0", right: "0", top: "" })
    ).toBe("0");
  });
});
