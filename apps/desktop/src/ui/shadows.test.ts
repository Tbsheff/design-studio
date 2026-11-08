import { describe, expect, it } from "vitest";

import {
  NEW_SHADOW,
  blurOf,
  formatShadows,
  parseShadows,
  splitTopLevel,
  withBlur,
} from "./features/inspector/shadows";

describe(parseShadows, () => {
  it("reads none and empty as no shadows", () => {
    expect.hasAssertions();

    expect(parseShadows("none")).toStrictEqual([]);
    expect(parseShadows("")).toStrictEqual([]);
  }, 0);

  it("reads the authored order with commas inside rgb() and var()", () => {
    expect.hasAssertions();

    expect(
      parseShadows(
        "0 4px 12px 0 rgb(0 0 0 / 0.12), inset 0 1px 2px var(--shadow, rgba(0, 0, 0, 0.2))"
      )
    ).toStrictEqual([
      {
        blur: "12px",
        color: "rgb(0 0 0 / 0.12)",
        inset: false,
        spread: "0",
        x: "0",
        y: "4px",
      },
      {
        blur: "2px",
        color: "var(--shadow, rgba(0, 0, 0, 0.2))",
        inset: true,
        spread: "0",
        x: "0",
        y: "1px",
      },
    ]);
  }, 0);

  it("reads the computed order with the color first", () => {
    expect.hasAssertions();

    expect(parseShadows("rgba(0, 0, 0, 0.12) 0px 4px 12px 0px")).toStrictEqual([
      {
        blur: "12px",
        color: "rgba(0, 0, 0, 0.12)",
        inset: false,
        spread: "0",
        x: "0",
        y: "4px",
      },
    ]);
  }, 0);

  it("fills missing blur and spread with 0", () => {
    expect.hasAssertions();

    expect(parseShadows("2px 3px red")).toStrictEqual([
      {
        blur: "0",
        color: "red",
        inset: false,
        spread: "0",
        x: "2px",
        y: "3px",
      },
    ]);
  }, 0);

  it("refuses values it cannot map to fields", () => {
    expect.hasAssertions();

    expect(parseShadows("4px red blue")).toBeNull();
    expect(parseShadows("red")).toBeNull();
  }, 0);
});

describe(formatShadows, () => {
  it("writes the default new shadow", () => {
    expect.hasAssertions();

    expect(formatShadows([NEW_SHADOW])).toBe("0 4px 12px 0 rgb(0 0 0 / 0.12)");
  }, 0);

  it("round-trips a list", () => {
    expect.hasAssertions();

    const value =
      "0 4px 12px 0 var(--color-ink), inset 1px 1px 0 0 rgb(255 255 255 / 0.5)";

    const parsed = parseShadows(value);
    expect(parsed).not.toBeNull();
    expect(formatShadows(parsed ?? [])).toBe(value);
    expect(parseShadows(formatShadows(parsed ?? []))).toStrictEqual(parsed);
  }, 0);

  it("writes an empty list as an empty value", () => {
    expect.hasAssertions();

    expect(formatShadows([])).toBe("");
  }, 0);
});

describe("layer blur", () => {
  it("reads blur from a filter list", () => {
    expect.hasAssertions();

    expect(blurOf("none")).toBe("");
    expect(blurOf("blur(4px)")).toBe("4px");
    expect(blurOf("brightness(1.2) blur(2px)")).toBe("2px");
  }, 0);

  it("sets, replaces and removes blur and keeps other filters", () => {
    expect.hasAssertions();

    expect(withBlur("none", "4px")).toBe("blur(4px)");
    expect(withBlur("brightness(1.2) blur(2px)", "8px")).toBe(
      "brightness(1.2) blur(8px)"
    );
    expect(withBlur("brightness(1.2) blur(2px)", "0")).toBe("brightness(1.2)");
    expect(withBlur("blur(2px)", "")).toBe("");
  }, 0);
});

describe(splitTopLevel, () => {
  it("ignores separators inside parentheses", () => {
    expect.hasAssertions();

    expect(splitTopLevel("a(1, 2), b", ",")).toStrictEqual(["a(1, 2)", "b"]);
    expect(splitTopLevel("rgb(0 0 0) 1px", " ")).toStrictEqual([
      "rgb(0 0 0)",
      "1px",
    ]);
  }, 0);
});
