import type { DesignSystemCoverage } from "@design-studio/contracts";

import { guessedKeys, toCssVarList } from "./draft-bar-model.js";
import { toPlural } from "./plural-model.js";

interface CoverageNoteView {
  readonly base: string | null;
  readonly found: string;
  readonly guessed: string | null;
  readonly next: string;
}

const toTokenCount = (count: number): string =>
  `${count} token${toPlural(count)}`;

const toGroupSummary = (tokens: readonly string[]): string => {
  const counts = new Map<string, number>();

  for (const token of tokens) {
    const group = token.split(".")[0] ?? token;
    counts.set(group, (counts.get(group) ?? 0) + 1);
  }

  return [...counts].map(([group, count]) => `${group} ${count}`).join(", ");
};

const toNextStep = (hasGaps: boolean): string => {
  if (hasGaps) {
    return "Ask the chat to improve this design system. It fills the gaps from your app. Or edit DESIGN.md yourself.";
  }

  return "Nothing is missing. Use the design system for new projects.";
};

const toCoverageNote = (coverage: DesignSystemCoverage): CoverageNoteView => {
  const keys = guessedKeys(coverage) ?? [];
  const baseCount = coverage.fallbacks.length;
  const foundCount = Math.max(0, coverage.tokens.length - baseCount);

  const found = `${toTokenCount(foundCount)} of ${coverage.tokens.length} found in your sources.`;
  let base: string | null = null;

  if (baseCount > 0) {
    base = `${toTokenCount(baseCount)} came from the base pack, not from your app (${toGroupSummary(coverage.fallbacks)}).`;
  }

  let guessed: string | null = null;

  if (keys.length > 0) {
    guessed = `${toTokenCount(keys.length)} not found under the usual names, so the studio guessed: ${toCssVarList(keys)}.`;
  }

  return {
    base,
    found,
    guessed,
    next: toNextStep(base !== null || guessed !== null),
  };
};

export { toCoverageNote };

export type { CoverageNoteView };
