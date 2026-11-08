import { describe, expect, it } from "vitest";

import {
  changedProps,
  colorToHex,
  displayColor,
  expandBox,
  hasChildElements,
  normalizeLength,
  parseNumber,
  stepValue,
  valuesFromStyles,
} from "./features/inspector/css-values";

const STEP_VALUE_ARG_0_1 = 0.1;
const STEP_VALUE_ARG_10 = 10;

const IS_FALSE = false;
const IS_TRUE = true;

describe("cssValues", () => {
  it("parses numbers with units", () => {
    expect.hasAssertions();

    expect(parseNumber("48px")).toStrictEqual({ unit: "px", value: 48 });
    expect(parseNumber("1.5")).toStrictEqual({ unit: "", value: 1.5 });
    expect(parseNumber("-0.5rem")).toStrictEqual({ unit: "rem", value: -0.5 });
    expect(parseNumber("auto")).toBeNull();
  }, 0);

  it("steps and normalizes lengths", () => {
    expect.hasAssertions();

    expect(stepValue("16px", STEP_VALUE_ARG_10, "px")).toBe("26px");
    expect(stepValue("normal", 1, "px")).toBe("1px");
    expect(stepValue("1.2", STEP_VALUE_ARG_0_1, "")).toBe("1.3");
    expect(normalizeLength("48", "px")).toBe("48px");
    expect(normalizeLength("1.4", "")).toBe("1.4");
    expect(normalizeLength("2rem", "px")).toBe("2rem");
  }, 0);

  it("converts colors for the swatch", () => {
    expect.hasAssertions();

    expect(colorToHex("rgb(194, 65, 12)")).toBe("#c2410c");
    expect(colorToHex("#abc")).toBe("#aabbcc");
    expect(colorToHex("rgba(0, 0, 0, 0.5)")).toBeNull();
    expect(colorToHex("oklch(0.5 0.1 200)")).toBeNull();
    expect(displayColor("rgba(0, 0, 0, 0)")).toBe("transparent");
  }, 0);

  it("expands box shorthands and prefers longhands", () => {
    expect.hasAssertions();

    expect(expandBox("1px 2px")).toStrictEqual({
      bottom: "1px",
      left: "2px",
      right: "2px",
      top: "1px",
    });
    expect(expandBox("1px 2px 3px")).toStrictEqual({
      bottom: "3px",
      left: "2px",
      right: "2px",
      top: "1px",
    });

    const values = valuesFromStyles({
      height: "61.59375px",
      padding: "8px 16px",
      "padding-top": "4px",
    });

    expect(values["padding-top"]).toBe("4px");
    expect(values["padding-left"]).toBe("16px");
    expect(values.height).toBe("61.59px");
  }, 0);

  it("detects child elements after the start tag", () => {
    expect.hasAssertions();

    expect(hasChildElements('<h1 class="a">Title</h1>')).toBe(IS_FALSE);
    expect(hasChildElements("<article><h2>A</h2></article>")).toBe(IS_TRUE);
    expect(hasChildElements('<p data-x="a<b">x &lt; y</p>')).toBe(IS_FALSE);
  }, 0);

  it("keeps only changed props", () => {
    expect.hasAssertions();

    const base = valuesFromStyles({
      color: "rgb(0, 0, 0)",
      "font-size": "16px",
    });

    expect(
      changedProps({ color: "rgb(0, 0, 0)", "font-size": "18px" }, base)
    ).toStrictEqual({ "font-size": "18px" });
  }, 0);
});
