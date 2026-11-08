import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const EXPECTED_20 = 20;

const css = readFileSync(
  fileURLToPath(new URL("inspector.css", import.meta.url)),
  "utf-8"
);

function declarations(
  source: string
): { prop: string; value: string; line: number }[] {
  const out: { prop: string; value: string; line: number }[] = [];
  source.split("\n").forEach((text, index) => {
    const match = /^\s*([a-z-]+)\s*:\s*([^;]+);/.exec(text);

    if (match?.[1] && match[2]) {
      out.push({ line: index + 1, prop: match[1], value: match[2] });
    }
  });

  return out;
}

describe("inspector.css spacing", () => {
  it("uses --s-* tokens for every padding, margin and gap", () => {
    expect.hasAssertions();

    const spacing = declarations(css).filter((declaration) =>
      /^(padding|margin|gap|row-gap|column-gap)(-|$)/.test(declaration.prop)
    );

    expect(spacing.length).toBeGreaterThan(EXPECTED_20);

    const raw = spacing
      .filter((declaration) => /\d(\.\d+)?px\b/.test(declaration.value))
      .map(
        (declaration) =>
          `${declaration.line}: ${declaration.prop}: ${declaration.value}`
      );

    expect(raw).toStrictEqual([]);
  }, 0);

  it("keeps inspector fields at 28px", () => {
    expect.hasAssertions();

    const field = /\.ins-field \{[^}]*\}/.exec(css)?.[0] ?? "";
    expect(field).toContain("height: 28px");
  }, 0);
});
