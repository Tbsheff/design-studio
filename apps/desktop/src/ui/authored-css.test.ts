import { describe, expect, it } from "vitest";

import {
  toCollapsedCrumbs,
  toCopyCss,
  isCoveredDeclaration,
  toOtherStyles,
  toAuthoredReply,
  toDeclarations,
  toSelectionPath,
  toPathCrumbs,
} from "./features/inspector/index.js";

const EXPECTED_20 = 20;
const EXPECTED_4 = 4;
const EXPECTED_60 = 60;
const SAMPLE_19990 = 19_990;
const SAMPLE_3 = 3;
const SAMPLE_4 = 4;
const SAMPLE_5 = 5;
const SAMPLE_6 = 6;

const IS_FALSE = false;
const IS_TRUE = true;

type Crumb = ReturnType<typeof toCollapsedCrumbs>[number];

const toCrumbLabel = (crumb: Crumb): number | string => {
  if (crumb.kind === "node") {
    return crumb.levels;
  }

  return `gap:${crumb.hidden.map((entry) => entry.levels).join(",")}`;
};

describe(toDeclarations, () => {
  it("keeps semicolons inside url() and quotes, and keeps !important", () => {
    expect.hasAssertions();

    expect(
      toDeclarations(
        'background: url(data:image/png;base64,AAA); content: "a;b"; color: red !important;'
      )
    ).toStrictEqual([
      { prop: "background", value: "url(data:image/png;base64,AAA)" },
      { prop: "content", value: '"a;b"' },
      { prop: "color", value: "red !important" },
    ]);
  }, 0);

  it("drops empty and broken declarations and keeps custom property case", () => {
    expect.hasAssertions();

    expect(toDeclarations(" ; nope; --Brand: #fff; /* c: d */ ")).toStrictEqual(
      [{ prop: "--Brand", value: "#fff" }]
    );
  }, 0);
});

describe(isCoveredDeclaration, () => {
  it("covers panel properties, their shorthands and longhands", () => {
    expect.hasAssertions();

    for (const prop of [
      "color",
      "filter",
      "box-shadow",
      "padding",
      "margin-inline",
      "border",
      "border-top",
      "border-top-left-radius",
      "font",
      "row-gap",
      "column-gap",
      "flex-grow",
      "flex-basis",
      "flex-flow",
    ]) {
      expect(isCoveredDeclaration(prop, "1px")).toBe(IS_TRUE);
    }
  }, 0);

  it("treats background as covered only when it is a color", () => {
    expect.hasAssertions();

    expect(isCoveredDeclaration("background", "#fff")).toBe(IS_TRUE);
    expect(isCoveredDeclaration("background", "var(--bg) !important")).toBe(
      IS_TRUE
    );
    expect(isCoveredDeclaration("background", "url(a.png) no-repeat")).toBe(
      IS_FALSE
    );
    expect(
      isCoveredDeclaration("background", "linear-gradient(red, blue)")
    ).toBe(IS_FALSE);
  }, 0);

  it("leaves other properties uncovered", () => {
    expect.hasAssertions();

    for (const prop of [
      "transform",
      "mix-blend-mode",
      "inset",
      "position",
      "border-collapse",
      "transition",
      "--x",
    ]) {
      expect(isCoveredDeclaration(prop, "1px")).toBe(IS_FALSE);
    }
  }, 0);
});

describe(toOtherStyles, () => {
  it("lists uncovered declarations once, the last one winning, with the source", () => {
    expect.hasAssertions();

    const rows = toOtherStyles({
      inline: "mix-blend-mode: multiply; padding: 4px",
      rules: [
        {
          css: "color: red; transform: rotate(1deg); filter: blur(2px);",
          selector: ".card",
          source: "site.css",
        },
        {
          css: "transform: rotate(2deg); position: relative;",
          selector: ".card.big",
          source: null,
        },
      ],
    });

    expect(rows).toStrictEqual([
      { prop: "transform", source: ".card.big", value: "rotate(2deg)" },
      { prop: "position", source: ".card.big", value: "relative" },
      { prop: "mix-blend-mode", source: "inline", value: "multiply" },
    ]);
  }, 0);
});

describe(toCopyCss, () => {
  it("writes rules in order and then the inline style", () => {
    expect.hasAssertions();

    const text = toCopyCss({
      inline: "opacity: 0.5",
      rules: [
        { css: "color: red; margin: 0px;", selector: ".a", source: "a.css" },
      ],
    });

    expect(text).toBe(
      ".a {\n  color: red;\n  margin: 0px;\n}\n\n/* inline */ {\n  opacity: 0.5;\n}"
    );
  }, 0);

  it("skips an empty inline style", () => {
    expect.hasAssertions();

    expect(
      toCopyCss({
        inline: " ",
        rules: [{ css: "color: red;", selector: "p", source: null }],
      })
    ).toBe("p {\n  color: red;\n}");
  }, 0);
});

describe(toAuthoredReply, () => {
  it("keeps only well-formed rules and caps them", () => {
    expect.hasAssertions();

    const big = "x".repeat(SAMPLE_19990);

    const parsed = toAuthoredReply({
      inline: "color: blue",
      rules: [
        { css: "color: red;", selector: "p", source: "a.css" },
        { css: "", selector: 1 },
        { css: "a: b", selector: "q", source: 5 },
        { css: big, selector: "big", source: null },
      ],
    });

    expect(parsed).toStrictEqual({
      inline: "color: blue",
      rules: [{ css: "color: red;", selector: "p", source: "a.css" }],
    });
    expect(
      toAuthoredReply({
        inline: "",
        rules: Array.from({ length: 80 }, () => ({
          css: "a: b",
          selector: "p",
          source: null,
        })),
      })?.rules
    ).toHaveLength(EXPECTED_60);
  }, 0);

  it("refuses a reply without rules or inline text", () => {
    expect.hasAssertions();

    expect(toAuthoredReply({ inline: "", rules: "x" })).toBeNull();
    expect(toAuthoredReply({ inline: 3, rules: [] })).toBeNull();
  }, 0);
});

describe("breadcrumb path", () => {
  const path = [1, 2, SAMPLE_3, SAMPLE_4, SAMPLE_5, SAMPLE_6].map(
    (step) => `div.n${step}`
  );

  it("parses a valid path, caps it, and refuses bad entries", () => {
    expect.hasAssertions();

    expect(toSelectionPath(path.slice(0, 2))).toStrictEqual([
      "div.n1",
      "div.n2",
    ]);
    expect(
      toSelectionPath(
        Array.from({ length: 30 }, (_unusedItem, index) => `p${index}`)
      )
    ).toHaveLength(EXPECTED_20);
    expect(toSelectionPath(["a", SAMPLE_3])).toStrictEqual([]);
    expect(toSelectionPath(["a", ""])).toStrictEqual([]);
    expect(toSelectionPath("x")).toStrictEqual([]);
  }, 0);

  it("counts parent levels from the element and collapses the middle of a long path", () => {
    expect.hasAssertions();

    expect(toPathCrumbs(["main", "div"])).toStrictEqual([
      { label: "main", levels: 2 },
      { label: "div", levels: 1 },
    ]);

    const shortCrumbs = toCollapsedCrumbs(
      toPathCrumbs(path.slice(0, SAMPLE_4))
    );

    expect(shortCrumbs).toHaveLength(EXPECTED_4);
    const crumbs = toCollapsedCrumbs(toPathCrumbs(path));
    expect(crumbs.map((crumb) => toCrumbLabel(crumb))).toStrictEqual([
      SAMPLE_6,
      "gap:5,4",
      SAMPLE_3,
      2,
      1,
    ]);
  }, 0);
});
