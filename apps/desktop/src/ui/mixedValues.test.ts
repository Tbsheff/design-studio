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
    source: source ? { file: "index.html", line, col: 7 } : null,
    styles,
    tag: "ARTICLE",
    text: "",
  };
}

describe(mergeValues, () => {
  it("keeps shared values and marks differing ones as mixed with an empty value", () => {
    const merged = mergeValues([
      valuesFromStyles({ "border-radius": "12px", color: "rgb(0, 0, 0)" }),
      valuesFromStyles({ "border-radius": "4px", color: "rgb(0, 0, 0)" }),
      valuesFromStyles({ "border-radius": "12px", color: "rgb(0, 0, 0)" }),
    ]);

    expect(merged.values["border-radius"]).toBe("");
    expect(merged.mixed.has("border-radius")).toBe(true);
    expect(merged.values.color).toBe("rgb(0, 0, 0)");
    expect(merged.mixed.has("color")).toBe(false);
  });

  it("marks a padding side as mixed when only that side differs", () => {
    const merged = mergeValues([
      valuesFromStyles({ padding: "8px" }),
      valuesFromStyles({ padding: "8px 8px 16px" }),
    ]);

    expect(merged.mixed.has("padding-bottom")).toBe(true);
    expect(merged.mixed.has("padding-top")).toBe(false);
    expect(merged.values["padding-top"]).toBe("8px");
  });
});

describe(batchEdits, () => {
  it("writes the value to every element whose own value differs, in one list", () => {
    const selections = [
      card(3, { "border-radius": "4px" }),
      card(4, { "border-radius": "12px" }),
      card(5, { "border-radius": "8px" }),
    ];

    const bases = selections.map((s) => valuesFromStyles(s.styles));
    const edits = batchEdits(selections, bases, { "border-radius": "8px" });
    expect(edits.map((e) => [e.source.line, e.style])).toEqual([
      [3, { "border-radius": "8px" }],
      [4, { "border-radius": "8px" }],
    ]);
    expect(edits[0]?.tag).toBe("article");
  });

  it("returns no edits when nothing changes", () => {
    const selections = [card(3, { color: "red" }), card(4, { color: "red" })];
    expect(
      batchEdits(
        selections,
        selections.map((s) => valuesFromStyles(s.styles)),
        { color: "red" }
      )
    ).toEqual([]);
  });
});

describe(multiBlockReason, () => {
  it("allows distinct source locations", () => {
    expect(multiBlockReason([card(3, {}), card(4, {})])).toBeNull();
  });

  it("refuses elements without a source", () => {
    expect(multiBlockReason([card(3, {}), card(4, {}, false)])).toMatch(
      /no source location/
    );
  });

  it("refuses elements that share one source location, as from a .map()", () => {
    expect(
      multiBlockReason([
        card(3, {}),
        { ...card(3, {}), selector: "li:nth-child(2)" },
      ])
    ).toMatch(/one line of code/);
  });

  it("refuses more elements than one batch takes", () => {
    expect(
      multiBlockReason(Array.from({ length: 51 }, (_, i) => card(i + 1, {})))
    ).toMatch(/50 elements or fewer/);
  });
});

describe(hasCurrentDependency, () => {
  it("flags relative math and allows plain or absolute input", () => {
    expect(hasCurrentDependency("+8", "px")).toBe(true);
    expect(hasCurrentDependency("8", "px")).toBe(false);
    expect(hasCurrentDependency("8*2", "px")).toBe(false);
    expect(hasCurrentDependency("", "px")).toBe(false);
  });
});

describe(nextSelection, () => {
  it("replaces on a plain click, adds and removes on Shift+click", () => {
    const [a, b] = [card(3, {}), card(4, {})];
    expect(nextSelection([a], b, false)).toEqual([b]);
    expect(nextSelection([a], b, true)).toEqual([a, b]);
    expect(nextSelection([a, b], { ...a }, true)).toEqual([b]);
  });
});
