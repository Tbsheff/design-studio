import type { CompiledTokenEntry, PackSummary } from "@design-studio/contracts";
import type { CSSProperties } from "react";

type PreviewMode = "dark" | "light";

const toTokenValue = (entry: CompiledTokenEntry, mode: PreviewMode): string => {
  if (mode === "dark") {
    return entry.darkValue ?? entry.value;
  }

  return entry.value;
};

const toVars = (
  entries: CompiledTokenEntry[],
  mode: PreviewMode
): CSSProperties =>
  Object.fromEntries(
    entries.map((entry) => [entry.cssVar, toTokenValue(entry, mode)])
  );

const toIsDual = (pack: PackSummary, entries: CompiledTokenEntry[]): boolean =>
  pack.mode === "light" && entries.some((entry) => entry.darkValue !== null);

const toLightLabel = (pack: PackSummary, isDual: boolean): string => {
  if (!isDual && pack.mode === "dark") {
    return "Dark";
  }

  return "Light";
};

const toModesClass = (isDual: boolean): string => {
  if (isDual) {
    return "pv-modes two";
  }

  return "pv-modes ";
};

export { toIsDual, toLightLabel, toModesClass, toVars };

export type { PreviewMode };
