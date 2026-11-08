import { describe, expect, it } from "vitest";

import {
  evaluateMath,
  resolveNumberInput,
} from "./features/inspector/math-input";

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

    expect(evaluateMath("12+")).toBeNull();
    expect(evaluateMath("(1+2")).toBeNull();
    expect(evaluateMath("4/0")).toBeNull();
    expect(evaluateMath("alert(1)")).toBeNull();
    expect(evaluateMath("10px; color: red")).toBeNull();
    expect(evaluateMath("")).toBeNull();
  }, 0);
});

describe(resolveNumberInput, () => {
  it("evaluates expressions in the field unit", () => {
    expect.hasAssertions();

    expect(resolveNumberInput("12+4", "0px", "px")).toBe("16px");
    expect(resolveNumberInput("16*2", "", "px")).toBe("32px");
    expect(resolveNumberInput("100/3", "0px", "px")).toBe("33.33px");
    expect(resolveNumberInput("(8+4)*2", "1px", "px")).toBe("24px");
    expect(resolveNumberInput("0.5*3", "1", "")).toBe("1.5");
  }, 0);

  it("adds a leading +N or +=N and subtracts -=N from the current value", () => {
    expect.hasAssertions();

    expect(resolveNumberInput("+8", "16px", "px")).toBe("24px");
    expect(resolveNumberInput("+=8", "16px", "px")).toBe("24px");
    expect(resolveNumberInput("-=4", "16px", "px")).toBe("12px");
    expect(resolveNumberInput("-= 2*3", "16px", "px")).toBe("10px");
    expect(resolveNumberInput("+2*3", "1rem", "px")).toBe("7rem");
    expect(resolveNumberInput("+8", "normal", "px")).toBe("8px");
    expect(resolveNumberInput("+1rem", "16px", "px")).toBeNull();
  }, 0);

  it("reads a leading -N as a plain negative number", () => {
    expect.hasAssertions();

    expect(resolveNumberInput("-4", "16px", "px")).toBe("-4px");
    expect(resolveNumberInput("-0.02em", "0em", "px")).toBe("-0.02em");
    expect(resolveNumberInput("-4*2", "1px", "px")).toBe("-8px");
    expect(resolveNumberInput("-=1rem", "16px", "px")).toBeNull();
  }, 0);

  it("leaves plain values and non-math text to the caller", () => {
    expect.hasAssertions();

    expect(resolveNumberInput("48", "0px", "px")).toBeNull();
    expect(resolveNumberInput("auto", "0px", "px")).toBeNull();
    expect(resolveNumberInput("var(--space-2)", "0px", "px")).toBeNull();
    expect(resolveNumberInput("10px; color: red", "0px", "px")).toBeNull();
    expect(resolveNumberInput("+", "16px", "px")).toBeNull();
    expect(resolveNumberInput("-=", "16px", "px")).toBeNull();
    expect(resolveNumberInput("+=+", "16px", "px")).toBeNull();
  }, 0);
});
