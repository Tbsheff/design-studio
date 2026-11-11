import type {
  CoverageGrade,
  DesignSystemCheckResult,
  DesignSystemCoverage,
} from "@design-studio/contracts";

import { copy } from "./copy.js";
import { toPlural } from "./plural-model.js";

type DraftChipTone = "busy" | "error" | "failed" | "passed";

interface DraftChip {
  readonly text: string;
  readonly tone: DraftChipTone;
}

const GRADE_LABELS: Record<CoverageGrade, string> = {
  excellent: "Excellent",
  "needs-review": "Needs review",
  rebuild: "Rebuild",
  usable: "Usable",
};

const KEY_TOKENS = ["color.bg", "color.fg", "color.primary", "font.body"];

const cssVarOf = (token: string): string => {
  const [group, name] = token.split(".");

  if (group === "color") {
    return `--${name}`;
  }

  return `--${group}-${name}`;
};

const toCssVarList = (tokens: readonly string[]): string =>
  tokens.map((token) => cssVarOf(token)).join(", ");

const guessedKeys = (coverage: DesignSystemCoverage): string[] | null => {
  if (
    !coverage.tokens.some(
      (entry) => entry.source === "folder" || entry.source === "tokens-file"
    )
  ) {
    return null;
  }

  return KEY_TOKENS.filter(
    (token) =>
      coverage.tokens.find((entry) => entry.token === token)?.verified !== true
  );
};

const saveReason = (
  check: DesignSystemCheckResult | null,
  reading: boolean,
  running: boolean
): string | null => {
  if (reading) {
    return "Wait while the studio reads your sources.";
  }

  if (running) {
    return "Wait for the chat to finish its work on this design system.";
  }

  if (!check || check.passed) {
    return null;
  }

  const count = check.problems.length;

  return `The check found ${count} problem${toPlural(count)}. Ask the chat to fix them, or use Save anyway.`;
};

const toDraftChip = (
  check: DesignSystemCheckResult | null,
  error: string | null,
  reading: boolean,
  running: boolean
): DraftChip => {
  if (reading) {
    return { text: copy.draftReading, tone: "busy" };
  }

  if (running) {
    return { text: copy.draftChecking, tone: "busy" };
  }

  if (error) {
    return { text: copy.draftLoadFailed, tone: "error" };
  }

  if (!check) {
    return { text: copy.draftChecking, tone: "busy" };
  }

  if (check.passed) {
    return { text: copy.checkPassed, tone: "passed" };
  }

  const count = check.problems.length;

  return {
    text: `${count}${copy.problem}${toPlural(count)}`,
    tone: "failed",
  };
};

export {
  GRADE_LABELS,
  cssVarOf,
  guessedKeys,
  saveReason,
  toCssVarList,
  toDraftChip,
};

export type { DraftChip, DraftChipTone };
