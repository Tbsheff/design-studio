import { describe, expect, it } from "vitest";

import {
  toChangedProps,
  toHexColor,
  toDisplayColor,
  toBoxSides,
  hasChildElements,
  toNormalizedLength,
  toParsedNumber,
  toSteppedValue,
  toStyleValues,
} from "./features/inspector/index";

describe("cssValues", () => {
  it("parses numbers with units", () => {
    expect(toParsedNumber("48px")).toEqual({ value: 48, unit: "px" });
    expect(toParsedNumber("1.5")).toEqual({ value: 1.5, unit: "" });
    expect(toParsedNumber("-0.5rem")).toEqual({ value: -0.5, unit: "rem" });
    expect(toParsedNumber("auto")).toBeNull();
  });

  it("steps and normalizes lengths", () => {
    expect(toSteppedValue("16px", 10, "px")).toBe("26px");
    expect(toSteppedValue("normal", 1, "px")).toBe("1px");
    expect(toSteppedValue("1.2", 0.1, "")).toBe("1.3");
    expect(toNormalizedLength("48", "px")).toBe("48px");
    expect(toNormalizedLength("1.4", "")).toBe("1.4");
    expect(toNormalizedLength("2rem", "px")).toBe("2rem");
  });

  it("converts colors for the swatch", () => {
    expect(toHexColor("rgb(194, 65, 12)")).toBe("#c2410c");
    expect(toHexColor("#abc")).toBe("#aabbcc");
    expect(toHexColor("rgba(0, 0, 0, 0.5)")).toBeNull();
    expect(toHexColor("oklch(0.5 0.1 200)")).toBeNull();
    expect(toDisplayColor("rgba(0, 0, 0, 0)")).toBe("transparent");
  });

  it("expands box shorthands and prefers longhands", () => {
    expect(toBoxSides("1px 2px")).toEqual({
      top: "1px",
      right: "2px",
      bottom: "1px",
      left: "2px",
    });
    expect(toBoxSides("1px 2px 3px")).toEqual({
      top: "1px",
      right: "2px",
      bottom: "3px",
      left: "2px",
    });
    const values = toStyleValues({
      padding: "8px 16px",
      "padding-top": "4px",
      height: "61.59375px",
    });
    expect(values["padding-top"]).toBe("4px");
    expect(values["padding-left"]).toBe("16px");
    expect(values.height).toBe("61.59px");
  });

  it("detects child elements after the start tag", () => {
    expect(hasChildElements('<h1 class="a">Title</h1>')).toBe(false);
    expect(hasChildElements("<article><h2>A</h2></article>")).toBe(true);
    expect(hasChildElements('<p data-x="a<b">x &lt; y</p>')).toBe(false);
  });

  it("keeps only changed props", () => {
    const base = toStyleValues({
      color: "rgb(0, 0, 0)",
      "font-size": "16px",
    });
    expect(
      toChangedProps({ color: "rgb(0, 0, 0)", "font-size": "18px" }, base)
    ).toEqual({ "font-size": "18px" });
  });
});
