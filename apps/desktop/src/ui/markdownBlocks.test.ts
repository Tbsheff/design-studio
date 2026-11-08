import { describe, expect, it } from "vitest";

import { splitMarkdownBlocks } from "./domain/markdown-blocks";

describe(splitMarkdownBlocks, () => {
  it("splits paragraphs on blank lines", () => {
    expect.hasAssertions();

    expect(splitMarkdownBlocks("One.\n\nTwo.\n\nThree")).toStrictEqual([
      "One.",
      "Two.",
      "Three",
    ]);
  }, 0);

  it("keeps a code fence with blank lines in one block, also while it is open", () => {
    expect.hasAssertions();

    expect(
      splitMarkdownBlocks(
        "Intro\n\n```ts\nconst a = 1;\n\nconst b = 2;\n```\n\nAfter"
      )
    ).toStrictEqual([
      "Intro",
      "```ts\nconst a = 1;\n\nconst b = 2;\n```",
      "After",
    ]);
    expect(
      splitMarkdownBlocks("Intro\n\n```ts\nconst a = 1;\n\nconst b")
    ).toStrictEqual(["Intro", "```ts\nconst a = 1;\n\nconst b"]);
  }, 0);

  it("keeps list items and indented lines with their block", () => {
    expect.hasAssertions();

    expect(splitMarkdownBlocks("- a\n\n- b\n\n  more\n\nEnd")).toStrictEqual([
      "- a\n\n- b\n\n  more",
      "End",
    ]);
  }, 0);

  it("gives the same earlier blocks as the text grows", () => {
    expect.hasAssertions();

    const full = "First para.\n\nSecond para here.\n\nThird.";
    const early = splitMarkdownBlocks(full.slice(0, 25));
    expect(splitMarkdownBlocks(full).slice(0, early.length - 1)).toStrictEqual(
      early.slice(0, -1)
    );
  }, 0);
});
