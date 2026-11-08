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
} from "./features/inspector/index.js";

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

    expect(toParsedNumber("48px")).toStrictEqual({ unit: "px", value: 48 });
    expect(toParsedNumber("1.5")).toStrictEqual({ unit: "", value: 1.5 });
    expect(toParsedNumber("-0.5rem")).toStrictEqual({
      unit: "rem",
      value: -0.5,
    });
    expect(toParsedNumber("auto")).toBeNull();
  }, 0);

  it("steps and normalizes lengths", () => {
    expect.hasAssertions();

    expect([
      toSteppedValue("16px", STEP_VALUE_ARG_10, "px"),
      toSteppedValue("normal", 1, "px"),
      toSteppedValue("1.2", STEP_VALUE_ARG_0_1, ""),
      toNormalizedLength("48", "px"),
      toNormalizedLength("1.4", ""),
      toNormalizedLength("2rem", "px"),
    ]).toStrictEqual(["26px", "1px", "1.3", "48px", "1.4", "2rem"]);
  }, 0);

  it("converts colors for the swatch", () => {
    expect.hasAssertions();

    expect([
      toHexColor("rgb(194, 65, 12)"),
      toHexColor("#abc"),
      toHexColor("rgba(0, 0, 0, 0.5)"),
      toHexColor("oklch(0.5 0.1 200)"),
      toDisplayColor("rgba(0, 0, 0, 0)"),
    ]).toStrictEqual(["#c2410c", "#aabbcc", null, null, "transparent"]);
  }, 0);

  it("expands box shorthands and prefers longhands", () => {
    expect.hasAssertions();

    expect(toBoxSides("1px 2px")).toStrictEqual({
      bottom: "1px",
      left: "2px",
      right: "2px",
      top: "1px",
    });
    expect(toBoxSides("1px 2px 3px")).toStrictEqual({
      bottom: "3px",
      left: "2px",
      right: "2px",
      top: "1px",
    });

    const values = toStyleValues({
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

    const base = toStyleValues({
      color: "rgb(0, 0, 0)",
      "font-size": "16px",
    });

    expect(
      toChangedProps({ color: "rgb(0, 0, 0)", "font-size": "18px" }, base)
    ).toStrictEqual({ "font-size": "18px" });
  }, 0);
});
