import type { SelectionContext } from "@design-studio/contracts";
import { describe, expect, it } from "vitest";

import { nextSelection } from "./features/canvas/index";
import { valuesFromStyles } from "./features/inspector/css-values";
import {
  batchEdits,
  hasCurrentDependency,
  mergeValues,
  multiBlockReason,
} from "./features/inspector/mixed-values";

const CARD_ARG_3 = 3;
const CARD_ARG_4 = 4;
const CARD_ARG_5 = 5;
const SAMPLE_3 = 3;
const SAMPLE_4 = 4;

const IS_FALSE = false;
const IS_TRUE = true;

function card(
  line: number,
  styles: Record<string, string>,
  source = true
): SelectionContext {
  return {
    ancestors: [],
    outerHTML: "<article></article>",
    rect: { height: 10, width: 10, x: 0, y: 0 },
    selector: `article:nth-of-type(${line})`,
    source: source ? { col: 7, file: "index.html", line } : null,
    styles,
    tag: "ARTICLE",
    text: "",
  };
}

describe(mergeValues, () => {
  it("keeps shared values and marks differing ones as mixed with an empty value", () => {
    expect.hasAssertions();

    const merged = mergeValues([
      valuesFromStyles({ "border-radius": "12px", color: "rgb(0, 0, 0)" }),
      valuesFromStyles({ "border-radius": "4px", color: "rgb(0, 0, 0)" }),
      valuesFromStyles({ "border-radius": "12px", color: "rgb(0, 0, 0)" }),
    ]);

    expect(merged.values["border-radius"]).toBe("");
    expect(merged.mixed.has("border-radius")).toBe(IS_TRUE);
    expect(merged.values.color).toBe("rgb(0, 0, 0)");
    expect(merged.mixed.has("color")).toBe(IS_FALSE);
  }, 0);

  it("marks a padding side as mixed when only that side differs", () => {
    expect.hasAssertions();

    const merged = mergeValues([
      valuesFromStyles({ padding: "8px" }),
      valuesFromStyles({ padding: "8px 8px 16px" }),
    ]);

    expect(merged.mixed.has("padding-bottom")).toBe(IS_TRUE);
    expect(merged.mixed.has("padding-top")).toBe(IS_FALSE);
    expect(merged.values["padding-top"]).toBe("8px");
  }, 0);
});

describe(batchEdits, () => {
  it("writes the value to every element whose own value differs, in one list", () => {
    expect.hasAssertions();

    const selections = [
      card(CARD_ARG_3, { "border-radius": "4px" }),
      card(CARD_ARG_4, { "border-radius": "12px" }),
      card(CARD_ARG_5, { "border-radius": "8px" }),
    ];

    const bases = selections.map((selection) =>
      valuesFromStyles(selection.styles)
    );
    const edits = batchEdits(selections, bases, { "border-radius": "8px" });
    expect(edits.map((edit) => [edit.source.line, edit.style])).toStrictEqual([
      [SAMPLE_3, { "border-radius": "8px" }],
      [SAMPLE_4, { "border-radius": "8px" }],
    ]);
    expect(edits[0]?.tag).toBe("article");
  }, 0);

  it("returns no edits when nothing changes", () => {
    expect.hasAssertions();

    const selections = [
      card(CARD_ARG_3, { color: "red" }),
      card(CARD_ARG_4, { color: "red" }),
    ];
    expect(
      batchEdits(
        selections,
        selections.map((selection) => valuesFromStyles(selection.styles)),
        { color: "red" }
      )
    ).toStrictEqual([]);
  }, 0);
});

describe(multiBlockReason, () => {
  it("allows distinct source locations", () => {
    expect.hasAssertions();

    expect(
      multiBlockReason([card(CARD_ARG_3, {}), card(CARD_ARG_4, {})])
    ).toBeNull();
  }, 0);

  it("refuses elements without a source", () => {
    expect.hasAssertions();

    expect(
      multiBlockReason([card(CARD_ARG_3, {}), card(CARD_ARG_4, {}, false)])
    ).toMatch(/no source location/);
  }, 0);

  it("refuses elements that share one source location, as from a .map()", () => {
    expect.hasAssertions();

    expect(
      multiBlockReason([
        card(CARD_ARG_3, {}),
        { ...card(CARD_ARG_3, {}), selector: "li:nth-child(2)" },
      ])
    ).toMatch(/one line of code/);
  }, 0);

  it("refuses more elements than one batch takes", () => {
    expect.hasAssertions();

    expect(
      multiBlockReason(
        Array.from({ length: 51 }, (_unusedItem, index) => card(index + 1, {}))
      )
    ).toMatch(/50 elements or fewer/);
  }, 0);
});

describe(hasCurrentDependency, () => {
  it("flags relative math and allows plain or absolute input", () => {
    expect.hasAssertions();

    expect(hasCurrentDependency("+8", "px")).toBe(IS_TRUE);
    expect(hasCurrentDependency("8", "px")).toBe(IS_FALSE);
    expect(hasCurrentDependency("8*2", "px")).toBe(IS_FALSE);
    expect(hasCurrentDependency("", "px")).toBe(IS_FALSE);
  }, 0);
});

describe(nextSelection, () => {
  it("replaces on a plain click, adds and removes on Shift+click", () => {
    expect.hasAssertions();

    const [first, second] = [card(CARD_ARG_3, {}), card(CARD_ARG_4, {})];
    expect(nextSelection([first], second, false)).toStrictEqual([second]);
    expect(nextSelection([first], second, true)).toStrictEqual([first, second]);
    expect(nextSelection([first, second], { ...first }, true)).toStrictEqual([
      second,
    ]);
  }, 0);
});
