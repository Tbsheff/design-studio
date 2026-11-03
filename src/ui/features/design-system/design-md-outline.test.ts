import { describe, expect, it } from "vitest";

import { outlineOf } from "./design-md-outline.js";

describe(outlineOf, () => {
  it("lists headings with line and offset and skips code fences", () => {
    const md =
      "# Brand\n\nIntro\n\n## Color\n\n```md\n## Not a heading\n```\n\n### Type **scale**\n";

    expect(outlineOf(md)).toEqual([
      { level: 1, line: 0, offset: 0, text: "Brand" },
      { level: 2, line: 4, offset: 16, text: "Color" },
      {
        level: 3,
        line: 10,
        offset: md.indexOf("### Type"),
        text: "Type scale",
      },
    ]);
  });
});
