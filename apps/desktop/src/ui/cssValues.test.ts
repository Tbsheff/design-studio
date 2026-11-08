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

const toMarkup = (tag: string, attributes: string, body: string): string => {
  const open = [tag, attributes].filter(Boolean).join(" ");

  return ["<", open, ">", body, "</", tag, ">"].join("");
};

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

    expect([
      stepValue("16px", STEP_VALUE_ARG_10, "px"),
      stepValue("normal", 1, "px"),
      stepValue("1.2", STEP_VALUE_ARG_0_1, ""),
      normalizeLength("48", "px"),
      normalizeLength("1.4", ""),
      normalizeLength("2rem", "px"),
    ]).toStrictEqual(["26px", "1px", "1.3", "48px", "1.4", "2rem"]);
  }, 0);

  it("converts colors for the swatch", () => {
    expect.hasAssertions();

    expect([
      colorToHex("rgb(194, 65, 12)"),
      colorToHex("#abc"),
      colorToHex("rgba(0, 0, 0, 0.5)"),
      colorToHex("oklch(0.5 0.1 200)"),
      displayColor("rgba(0, 0, 0, 0)"),
    ]).toStrictEqual(["#c2410c", "#aabbcc", null, null, "transparent"]);
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
});

describe("cssValues markup", () => {
  it("detects child elements after the start tag", () => {
    expect.hasAssertions();

    expect(hasChildElements(toMarkup("h1", 'class="a"', "Title"))).toBe(
      IS_FALSE
    );
    const heading = toMarkup("h2", "", "A");
    expect(hasChildElements(toMarkup("article", "", heading))).toBe(IS_TRUE);
    expect(hasChildElements(toMarkup("p", 'data-x="a<b"', "x &lt; y"))).toBe(
      IS_FALSE
    );
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
