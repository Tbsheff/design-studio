import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const EXPECTED_20 = 20;

interface Declaration {
  readonly line: number;
  readonly prop: string;
  readonly value: string;
}

const css = await readFile(
  fileURLToPath(new URL("inspector.css", import.meta.url)),
  "utf-8"
);

const DECLARATION = /^\s*(?<prop>[a-z-]+): (?<value>[^;]+);/u;
const SPACING_PROP = /^(?:padding|margin|gap|row-gap|column-gap)(?:-|$)/u;
const RAW_PIXELS = /\d(?:\.\d+)?px\b/u;
const FIELD_HEIGHT = /\.ins-field \{[^}]*height: 28px[^}]*\}/u;

const declarations = (source: string): Declaration[] => {
  const out: Declaration[] = [];

  for (const [index, text] of source.split("\n").entries()) {
    const match = DECLARATION.exec(text);
    const prop = match?.groups?.prop;
    const value = match?.groups?.value;

    if (prop && value) {
      out.push({ line: index + 1, prop, value });
    }
  }

  return out;
};

describe("inspector.css spacing", () => {
  it("uses --s-* tokens for every padding, margin and gap", () => {
    expect.hasAssertions();

    const spacing = declarations(css).filter((declaration) =>
      SPACING_PROP.test(declaration.prop)
    );

    expect(spacing.length).toBeGreaterThan(EXPECTED_20);

    const raw = spacing
      .filter((declaration) => RAW_PIXELS.test(declaration.value))
      .map(
        (declaration) =>
          `${declaration.line}: ${declaration.prop}: ${declaration.value}`
      );

    expect(raw).toStrictEqual([]);
  }, 0);

  it("keeps inspector fields at 28px", () => {
    expect.hasAssertions();

    expect(css).toMatch(FIELD_HEIGHT);
  }, 0);
});
