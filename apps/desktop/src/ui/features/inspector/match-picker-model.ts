import { hitsForRow } from "@design-studio/contracts/style-search";
import type {
  StyleHit,
  StyleValueRow,
} from "@design-studio/contracts/style-search";

import type { DesignTokens } from "./deps.js";
import {
  listClassCandidates,
  listDesignCandidates,
  listUniqueTokens,
  listVarCandidates,
} from "./match-candidates-model.js";
import type { Candidate } from "./match-candidates-model.js";
import { PICK_SHOWN } from "./match-scan-model.js";
import type { PageVar } from "./match-scan-model.js";

type Candidates = Candidate[];

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

  return listDesignCandidates(picking, tokens.entries, tokens.mode);
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

  return listUniqueTokens([
    ...listVarCandidates(picking, vars),
    ...listClassCandidates(picking, pageHits),
    ...toDesignCandidates(picking, tokens),
  ]);
};

const toFilter = (text: string): string => text.trim().toLowerCase();

const toShownCandidates = (
  candidates: Candidate[],
  filter: string
): Candidate[] => {
  const found: Candidate[] = [];

  for (const candidate of candidates) {
    const isMatch =
      !filter ||
      candidate.token.toLowerCase().includes(filter) ||
      candidate.hint.toLowerCase().includes(filter);

    if (isMatch) {
      found.push(candidate);
    }
  }

  return found.slice(0, PICK_SHOWN);
};

const toPickedToken = (
  shown: Candidate[],
  filter: string,
  text: string
): string => {
  const [first] = shown;

  if (first && first.token.toLowerCase() === filter) {
    return first.token;
  }

  return text.trim();
};

export { toCandidates, toFilter, toPickedToken, toShownCandidates, toTargets };

export type { Candidates };
