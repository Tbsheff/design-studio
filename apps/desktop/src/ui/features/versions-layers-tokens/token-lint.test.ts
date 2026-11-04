import type { CompiledTokenEntry } from "@design-studio/contracts";
import { describe, expect, it } from "vitest";

import { valuesFromStyles } from "../inspector/css-values.js";
import { lintValues } from "./token-lint.js";

const entries: CompiledTokenEntry[] = [
  {
    cssVar: "--primary",
    darkValue: "#ff6666",
    path: "color.primary",
    type: "color",
    value: "#ff0000",
  },
  {
    cssVar: "--fg",
    darkValue: "#eeeeee",
    path: "color.fg",
    type: "color",
    value: "#111111",
  },
  {
    cssVar: "--font-body",
    darkValue: null,
    path: "font.body",
    type: "fontFamily",
    value: "Inter, sans-serif",
  },
  {
    cssVar: "--space-4",
    darkValue: null,
    path: "space.4",
    type: "dimension",
    value: "16px",
  },
];

const css = (text: string) => ({
  inline: "",
  rules: [{ selector: ".x", css: text, source: "index.html" }],
});

describe(lintValues, () => {
  it("names the nearest token and its ΔE for an off-palette color", () => {
    const values = valuesFromStyles({ color: "rgb(250, 10, 20)" });
    const [issue] = lintValues(
      values,
      entries,
      "light",
      css("color: #fa0a14;")
    );

    expect(issue?.kind).toBe("color");
    expect(issue?.token.cssVar).toBe("--primary");
    expect(issue?.deltaE).toBeGreaterThan(0);
    expect(issue?.deltaE).toBeLessThan(10);
  });

  it("flags a raw value that equals a token, and skips values written as var()", () => {
    const values = valuesFromStyles({
      "background-color": "rgb(17, 17, 17)",
      color: "rgb(255, 0, 0)",
    });

    const issues = lintValues(
      values,
      entries,
      "light",
      css("color: #ff0000; background-color: var(--fg);")
    );
    expect(
      issues.map((issue) => [
        issue.props,
        issue.token.cssVar,
        issue.token.exact,
      ])
    ).toEqual([[["color"], "--primary", true]]);
  });

  it("skips values the element only inherits", () => {
    const values = valuesFromStyles({ color: "rgb(250, 10, 20)" });
    expect(
      lintValues(values, entries, "light", css("display: block;"))
    ).toEqual([]);
  });

  it("groups a padding shorthand near a space token and flags a font outside the font tokens", () => {
    const values = valuesFromStyles({
      "font-family": "Comic Sans MS",
      "padding-bottom": "15px",
      "padding-left": "15px",
      "padding-right": "15px",
      "padding-top": "15px",
    });
    const issues = lintValues(
      values,
      entries,
      "light",
      css('padding: 15px; font-family: "Comic Sans MS";')
    );

    const padding = issues.find((issue) => issue.kind === "size");
    expect(padding?.props).toEqual([
      "padding-top",
      "padding-right",
      "padding-bottom",
      "padding-left",
    ]);
    expect(padding?.token.cssVar).toBe("--space-4");
    expect(issues.find((issue) => issue.kind === "font")?.token.cssVar).toBe(
      "--font-body"
    );
  });

  it("counts unsaved edits as authored", () => {
    const values = valuesFromStyles({ color: "#00ff00" });
    expect(lintValues(values, entries, "light", null, ["color"])).toHaveLength(
      1
    );
  });
});
