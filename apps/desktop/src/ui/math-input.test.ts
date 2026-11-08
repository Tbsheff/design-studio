import { describe, expect, it } from "vitest";

import { runMath, toNumberInput } from "./features/inspector/index.js";

describe(runMath, () => {
  it("handles operator precedence and parentheses", () => {
    expect.hasAssertions();

    expect(runMath("16*2")).toStrictEqual({ unit: "", value: 32 });
    expect(runMath("12+4*2")).toStrictEqual({ unit: "", value: 20 });
    expect(runMath("(8+4)*2")).toStrictEqual({ unit: "", value: 24 });
    expect(runMath("-(2+3)")).toStrictEqual({ unit: "", value: -5 });
  }, 0);

  it("keeps one unit and refuses mixed units", () => {
    expect.hasAssertions();

    expect(runMath("12px+4")).toStrictEqual({ unit: "px", value: 16 });
    expect(runMath("1rem*2")).toStrictEqual({ unit: "rem", value: 2 });
    expect(runMath("12px+1rem")).toBeNull();
  }, 0);

  it("refuses incomplete or unsafe input", () => {
    expect.hasAssertions();

    expect([
      runMath("12+"),
      runMath("(1+2"),
      runMath("4/0"),
      runMath("alert(1)"),
      runMath("10px; color: red"),
      runMath(""),
    ]).toStrictEqual([null, null, null, null, null, null]);
  }, 0);
});

describe(toNumberInput, () => {
  it("evaluates expressions in the field unit", () => {
    expect.hasAssertions();

    expect([
      toNumberInput("12+4", "0px", "px"),
      toNumberInput("16*2", "", "px"),
      toNumberInput("100/3", "0px", "px"),
      toNumberInput("(8+4)*2", "1px", "px"),
      toNumberInput("0.5*3", "1", ""),
    ]).toStrictEqual(["16px", "32px", "33.33px", "24px", "1.5"]);
  }, 0);

  it("adds a leading +N or +=N and subtracts -=N from the current value", () => {
    expect.hasAssertions();

    expect([
      toNumberInput("+8", "16px", "px"),
      toNumberInput("+=8", "16px", "px"),
      toNumberInput("-=4", "16px", "px"),
      toNumberInput("-= 2*3", "16px", "px"),
      toNumberInput("+2*3", "1rem", "px"),
      toNumberInput("+8", "normal", "px"),
      toNumberInput("+1rem", "16px", "px"),
    ]).toStrictEqual(["24px", "24px", "12px", "10px", "7rem", "8px", null]);
  }, 0);

  it("reads a leading -N as a plain negative number", () => {
    expect.hasAssertions();

    expect([
      toNumberInput("-4", "16px", "px"),
      toNumberInput("-0.02em", "0em", "px"),
      toNumberInput("-4*2", "1px", "px"),
      toNumberInput("-=1rem", "16px", "px"),
    ]).toStrictEqual(["-4px", "-0.02em", "-8px", null]);
  }, 0);

  it("leaves plain values and non-math text to the caller", () => {
    expect.hasAssertions();

    expect([
      toNumberInput("48", "0px", "px"),
      toNumberInput("auto", "0px", "px"),
      toNumberInput("var(--space-2)", "0px", "px"),
      toNumberInput("10px; color: red", "0px", "px"),
      toNumberInput("+", "16px", "px"),
      toNumberInput("-=", "16px", "px"),
      toNumberInput("+=+", "16px", "px"),
    ]).toStrictEqual([null, null, null, null, null, null, null]);
  }, 0);
});
