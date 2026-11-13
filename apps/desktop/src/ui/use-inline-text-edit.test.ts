import { describe, expect, it } from "vitest";

import { MAX_INLINE_TEXT, parseTextCommit } from "./features/canvas/index.js";

const base = {
  at: 1,
  isHeld: false,
  ns: "studio",
  token: "t",
  type: "text-commit",
} as const;

const BAD_TEXT_MESSAGE = JSON.parse(
  '{"at":1,"ns":"studio","selector":"h1","text":7,"token":"t","type":"text-commit"}'
);

describe(parseTextCommit, () => {
  it("accepts a string selector and text", () => {
    expect.hasAssertions();

    expect(
      parseTextCommit({ ...base, selector: "body > main > h1", text: "Hello" })
    ).toStrictEqual({
      isHeld: false,
      selector: "body > main > h1",
      text: "Hello",
    });
  }, 0);

  it("refuses bad shapes and long text", () => {
    expect.hasAssertions();

    expect(parseTextCommit({ ...base, selector: "", text: "x" })).toBeNull();
    expect(
      parseTextCommit({
        ...base,
        selector: "h1",
        text: "x".repeat(MAX_INLINE_TEXT + 1),
      })
    ).toBeNull();
    expect(parseTextCommit(BAD_TEXT_MESSAGE)).toBeNull();
    expect(
      parseTextCommit({
        ns: "studio",
        selector: "h1",
        state: "start",
        token: "t",
        type: "text-edit",
      })
    ).toBeNull();
  }, 0);
});
