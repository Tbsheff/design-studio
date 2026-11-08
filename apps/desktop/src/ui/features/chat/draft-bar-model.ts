import type {
  CoverageGrade,
  DesignSystemCheckResult,
  DesignSystemCoverage,
} from "@design-studio/contracts";

import { toPlural } from "./plural-model.js";

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
    return "Save is off while the studio reads your sources.";
  }

  if (running) {
    return "Save is off while the AI works on this design system.";
  }

  if (!check || check.passed) {
    return null;
  }

  const count = check.problems.length;

  return `Save is off: the check found ${count} problem${toPlural(count)}. Improve with AI fixes them.`;
};

export { GRADE_LABELS, cssVarOf, guessedKeys, saveReason, toCssVarList };
