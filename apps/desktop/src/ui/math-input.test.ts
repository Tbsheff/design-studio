import { describe, expect, it } from "vitest";

import {
  evaluateMath,
  resolveNumberInput,
} from "./features/inspector/index.js";

describe(evaluateMath, () => {
  it("handles operator precedence and parentheses", () => {
    expect.hasAssertions();

    expect(evaluateMath("16*2")).toStrictEqual({ unit: "", value: 32 });
    expect(evaluateMath("12+4*2")).toStrictEqual({ unit: "", value: 20 });
    expect(evaluateMath("(8+4)*2")).toStrictEqual({ unit: "", value: 24 });
    expect(evaluateMath("-(2+3)")).toStrictEqual({ unit: "", value: -5 });
  }, 0);

  it("keeps one unit and refuses mixed units", () => {
    expect.hasAssertions();

    expect(evaluateMath("12px+4")).toStrictEqual({ unit: "px", value: 16 });
    expect(evaluateMath("1rem*2")).toStrictEqual({ unit: "rem", value: 2 });
    expect(evaluateMath("12px+1rem")).toBeNull();
  }, 0);

  it("refuses incomplete or unsafe input", () => {
    expect.hasAssertions();

    expect([
      evaluateMath("12+"),
      evaluateMath("(1+2"),
      evaluateMath("4/0"),
      evaluateMath("alert(1)"),
      evaluateMath("10px; color: red"),
      evaluateMath(""),
    ]).toStrictEqual([null, null, null, null, null, null]);
  }, 0);
});

describe(resolveNumberInput, () => {
  it("evaluates expressions in the field unit", () => {
    expect.hasAssertions();

    expect([
      resolveNumberInput("12+4", "0px", "px"),
      resolveNumberInput("16*2", "", "px"),
      resolveNumberInput("100/3", "0px", "px"),
      resolveNumberInput("(8+4)*2", "1px", "px"),
      resolveNumberInput("0.5*3", "1", ""),
    ]).toStrictEqual(["16px", "32px", "33.33px", "24px", "1.5"]);
  }, 0);

  it("adds a leading +N or +=N and subtracts -=N from the current value", () => {
    expect.hasAssertions();

    expect([
      resolveNumberInput("+8", "16px", "px"),
      resolveNumberInput("+=8", "16px", "px"),
      resolveNumberInput("-=4", "16px", "px"),
      resolveNumberInput("-= 2*3", "16px", "px"),
      resolveNumberInput("+2*3", "1rem", "px"),
      resolveNumberInput("+8", "normal", "px"),
      resolveNumberInput("+1rem", "16px", "px"),
    ]).toStrictEqual(["24px", "24px", "12px", "10px", "7rem", "8px", null]);
  }, 0);

  it("reads a leading -N as a plain negative number", () => {
    expect.hasAssertions();

    expect([
      resolveNumberInput("-4", "16px", "px"),
      resolveNumberInput("-0.02em", "0em", "px"),
      resolveNumberInput("-4*2", "1px", "px"),
      resolveNumberInput("-=1rem", "16px", "px"),
    ]).toStrictEqual(["-4px", "-0.02em", "-8px", null]);
  }, 0);

  it("leaves plain values and non-math text to the caller", () => {
    expect.hasAssertions();

    expect([
      resolveNumberInput("48", "0px", "px"),
      resolveNumberInput("auto", "0px", "px"),
      resolveNumberInput("var(--space-2)", "0px", "px"),
      resolveNumberInput("10px; color: red", "0px", "px"),
      resolveNumberInput("+", "16px", "px"),
      resolveNumberInput("-=", "16px", "px"),
      resolveNumberInput("+=+", "16px", "px"),
    ]).toStrictEqual([null, null, null, null, null, null, null]);
  }, 0);
});
