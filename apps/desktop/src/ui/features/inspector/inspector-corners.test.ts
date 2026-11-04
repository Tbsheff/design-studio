import { describe, expect, it } from "vitest";

import { joinCorners } from "./inspector-corners.js";

describe(joinCorners, () => {
  it("writes four values in border-radius order", { timeout: 5000 }, () => {
    expect.hasAssertions();
    expect(
      joinCorners({ bottom: "12px", left: "16px", right: "8px", top: "4px" })
    ).toBe("4px 8px 12px 16px");
  });

  it("collapses equal corners to one value", { timeout: 5000 }, () => {
    expect.hasAssertions();
    expect(
      joinCorners({ bottom: "8px", left: "8px", right: "8px", top: "8px" })
    ).toBe("8px");
    expect(joinCorners({ bottom: "0", left: "0", right: "0", top: "" })).toBe(
      "0"
    );
  });
});
