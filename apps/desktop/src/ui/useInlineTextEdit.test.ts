import { describe, expect, it } from "vitest";

import {
  MAX_INLINE_TEXT,
  parseTextCommit,
} from "./features/canvas/use-inline-text-edit";

const base = { at: 1, ns: "studio", token: "t", type: "text-commit" } as const;

describe(parseTextCommit, () => {
  it("accepts a string selector and text", () => {
    expect(
      parseTextCommit({ ...base, selector: "body > main > h1", text: "Hello" })
    ).toEqual({ selector: "body > main > h1", text: "Hello" });
  });

  it("refuses bad shapes and long text", () => {
    expect(parseTextCommit({ ...base, selector: "", text: "x" })).toBeNull();
    expect(
      parseTextCommit({
        ...base,
        selector: "h1",
        text: "x".repeat(MAX_INLINE_TEXT + 1),
      })
    ).toBeNull();
    expect(
      parseTextCommit({
        ...base,
        selector: "h1",
        text: 7,
      } as unknown as Parameters<typeof parseTextCommit>[0])
    ).toBeNull();
    expect(
      parseTextCommit({
        ns: "studio",
        selector: "h1",
        state: "start",
        token: "t",
        type: "text-edit",
      })
    ).toBeNull();
  });
});
