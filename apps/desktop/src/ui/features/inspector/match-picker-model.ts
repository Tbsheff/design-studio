import { hitsForRow } from "@design-studio/contracts/style-search";
import type {
  StyleHit,
  StyleValueRow,
} from "@design-studio/contracts/style-search";

import type { DesignTokens } from "./deps.js";
import {
  classCandidates,
  designCandidates,
  uniqueTokens,
  varCandidates,
} from "./match-candidates.js";
import type { PageVar } from "./match-scan.js";

type Candidates = ReturnType<typeof uniqueTokens>;

const toTargets = (
  picking: StyleValueRow | null,
  hits: StyleHit[]
): StyleHit[] => {
  if (!picking) {
    return [];
  }

  return hitsForRow(hits, picking);
};

const toDesignCandidates = (
  picking: StyleValueRow,
  tokens: DesignTokens | null
): Candidates => {
  if (!tokens) {
    return [];
  }

  return designCandidates(picking, tokens.entries, tokens.mode);
};

const toCandidates = (
  picking: StyleValueRow | null,
  vars: PageVar[],
  pageHits: StyleHit[],
  tokens: DesignTokens | null
): Candidates => {
  if (!picking) {
    return [];
  }

  return uniqueTokens([
    ...varCandidates(picking, vars),
    ...classCandidates(picking, pageHits),
    ...toDesignCandidates(picking, tokens),
  ]);
};

export { toCandidates, toTargets };

export type { Candidates };
