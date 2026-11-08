import { describe, expect, it } from "vitest";

import { runMath, toNumberInput } from "./features/inspector/math-input";

describe(runMath, () => {
  it("handles operator precedence and parentheses", () => {
    expect(runMath("16*2")).toEqual({ value: 32, unit: "" });
    expect(runMath("12+4*2")).toEqual({ value: 20, unit: "" });
    expect(runMath("(8+4)*2")).toEqual({ value: 24, unit: "" });
    expect(runMath("-(2+3)")).toEqual({ value: -5, unit: "" });
  });

  it("keeps one unit and refuses mixed units", () => {
    expect(runMath("12px+4")).toEqual({ value: 16, unit: "px" });
    expect(runMath("1rem*2")).toEqual({ value: 2, unit: "rem" });
    expect(runMath("12px+1rem")).toBeNull();
  });

  it("refuses incomplete or unsafe input", () => {
    expect(runMath("12+")).toBeNull();
    expect(runMath("(1+2")).toBeNull();
    expect(runMath("4/0")).toBeNull();
    expect(runMath("alert(1)")).toBeNull();
    expect(runMath("10px; color: red")).toBeNull();
    expect(runMath("")).toBeNull();
  });
});

describe(toNumberInput, () => {
  it("evaluates expressions in the field unit", () => {
    expect(toNumberInput("12+4", "0px", "px")).toBe("16px");
    expect(toNumberInput("16*2", "", "px")).toBe("32px");
    expect(toNumberInput("100/3", "0px", "px")).toBe("33.33px");
    expect(toNumberInput("(8+4)*2", "1px", "px")).toBe("24px");
    expect(toNumberInput("0.5*3", "1", "")).toBe("1.5");
  });

  it("adds a leading +N or +=N and subtracts -=N from the current value", () => {
    expect(toNumberInput("+8", "16px", "px")).toBe("24px");
    expect(toNumberInput("+=8", "16px", "px")).toBe("24px");
    expect(toNumberInput("-=4", "16px", "px")).toBe("12px");
    expect(toNumberInput("-= 2*3", "16px", "px")).toBe("10px");
    expect(toNumberInput("+2*3", "1rem", "px")).toBe("7rem");
    expect(toNumberInput("+8", "normal", "px")).toBe("8px");
    expect(toNumberInput("+1rem", "16px", "px")).toBeNull();
  });

  it("reads a leading -N as a plain negative number", () => {
    expect(toNumberInput("-4", "16px", "px")).toBe("-4px");
    expect(toNumberInput("-0.02em", "0em", "px")).toBe("-0.02em");
    expect(toNumberInput("-4*2", "1px", "px")).toBe("-8px");
    expect(toNumberInput("-=1rem", "16px", "px")).toBeNull();
  });

  it("leaves plain values and non-math text to the caller", () => {
    expect(toNumberInput("48", "0px", "px")).toBeNull();
    expect(toNumberInput("auto", "0px", "px")).toBeNull();
    expect(toNumberInput("var(--space-2)", "0px", "px")).toBeNull();
    expect(toNumberInput("10px; color: red", "0px", "px")).toBeNull();
    expect(toNumberInput("+", "16px", "px")).toBeNull();
    expect(toNumberInput("-=", "16px", "px")).toBeNull();
    expect(toNumberInput("+=+", "16px", "px")).toBeNull();
  });
});
