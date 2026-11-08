import type { PackSummary } from "@design-studio/contracts";
import type { CSSProperties } from "react";

interface RampCell {
  readonly id: string;
  readonly style: CSSProperties;
}

type FontStack = (family: string, fallback: string) => string;

const RAMP_TEXT = "6 16 30 48 68 100 72 48";

const RAMP_PRIMARY_CUTOFF = 5;

const toSwatch = (pack: PackSummary, name: string, fallback: string): string =>
  pack.swatches.find((item) => item.name === name)?.value ?? fallback;

const toRampColor = (step: number, index: number): string => {
  if (index <= RAMP_PRIMARY_CUTOFF) {
    return `color-mix(in oklch, var(--pc-primary) ${step}%, var(--pc-bg))`;
  }

  return `color-mix(in oklch, var(--pc-primary) ${step}%, var(--pc-fg))`;
};

const toRampCells = (): RampCell[] => {
  const cells: RampCell[] = [];

  for (const [index, text] of RAMP_TEXT.split(" ").entries()) {
    cells.push({
      id: `ramp-${index}`,
      style: { background: toRampColor(Number(text), index) },
    });
  }

  return cells;
};

const RAMP_CELLS: readonly RampCell[] = toRampCells();

const toPackVars = (pack: PackSummary, toStack: FontStack): CSSProperties =>
  ({
    "--pc-accent": toSwatch(pack, "accent", "#888"),
    "--pc-bg": toSwatch(pack, "bg", "#fff"),
    "--pc-body": toStack(pack.fonts.body, "var(--font)"),
    "--pc-border": toSwatch(pack, "border", "#ddd"),
    "--pc-display": toStack(pack.fonts.display, "var(--serif)"),
    "--pc-fg": toSwatch(pack, "fg", "#111"),
    "--pc-primary": toSwatch(pack, "primary", "#555"),
    "--pc-surface": toSwatch(pack, "surface", "#f5f5f5"),
  }) as CSSProperties;

const toFamilyName = (family: string): string =>
  family.split(",")[0]?.replaceAll(/['"]/gu, "").trim() ?? "";

const toFontNames = (pack: PackSummary): string => {
  const display = toFamilyName(pack.fonts.display);
  const body = toFamilyName(pack.fonts.body);

  if (display === body || !body) {
    return display;
  }

  return `${display} / ${body}`;
};

export { RAMP_CELLS, toFontNames, toPackVars };

export type { FontStack, RampCell };
