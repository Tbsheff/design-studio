import type { PackSummary } from "@design-studio/contracts";

import { uiStore } from "../../platform/storage.js";

type LibraryDialog =
  | { kind: "rename" | "delete"; pack: PackSummary }
  | { kind: "conflict"; file: File; existing: PackSummary }
  | null;

const SERIF = "Georgia, serif";
const SANS = "system-ui, sans-serif";

const leave = (patch: Parameters<typeof uiStore.set>[0]): void => {
  uiStore.set({ libraryFrom: null, screen: "home", ...patch });
};

const toSwatchValue = (pack: PackSummary, name: string): string | null =>
  pack.swatches.find((item) => item.name === name)?.value ?? null;

const toProblemsTitle = (count: number): string => {
  if (count === 1) {
    return "1 design system could not load";
  }

  return `${count} design systems could not load`;
};

const toImportedText = (name: string, isReplaced: boolean): string => {
  if (isReplaced) {
    return `Replaced ${name}.`;
  }

  return `Imported ${name}.`;
};

const toImportLabel = (isImporting: boolean): string => {
  if (isImporting) {
    return "Importing…";
  }

  return "Import…";
};

export {
  SANS,
  SERIF,
  leave,
  toImportLabel,
  toImportedText,
  toProblemsTitle,
  toSwatchValue,
};

export type { LibraryDialog };
