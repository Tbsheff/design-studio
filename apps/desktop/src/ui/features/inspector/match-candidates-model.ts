import type { CompiledTokenEntry } from "@design-studio/contracts";
import { TOKEN_GROUP_FOR_PROPERTY } from "@design-studio/contracts";
import { isRawClass, kindOf } from "@design-studio/contracts/style-search";
import type {
  StyleHit,
  StyleKind,
  StyleValueRow,
} from "@design-studio/contracts/style-search";

import {
  colorHex,
  lengthToPx,
  matchForProperty,
} from "../../../shared/token-match.js";
import type { TokenMode } from "../../../shared/token-match.js";
import type { PageVar } from "./match-scan.js";

interface Candidate {
  readonly token: string;
  readonly value: string;
  readonly hint: string;
}

const SAME_VALUE_HINT = "same value";

const toShownValue = (row: Pick<StyleValueRow, "kind" | "value">): string => {
  if (row.kind === "color") {
    return colorHex(row.value) ?? row.value;
  }

  return row.value;
};

const toSameHint = (isSame: boolean): string => {
  if (isSame) {
    return SAME_VALUE_HINT;
  }

  return "";
};

const listDesignCandidates = (
  row: StyleValueRow,
  entries: CompiledTokenEntry[],
  mode: TokenMode
): Candidate[] => {
  const [property] = row.properties;

  if (!property || !TOKEN_GROUP_FOR_PROPERTY[property]) {
    return [];
  }

  return matchForProperty(property, row.value, entries, mode).map((match) => ({
    hint: match.path,
    token: match.cssVar,
    value: match.value,
  }));
};

const isSameValue = (
  kind: StyleKind,
  first: string,
  second: string
): boolean => {
  if (kind === "color") {
    return colorHex(first) !== null && colorHex(first) === colorHex(second);
  }

  const px = lengthToPx(first);

  return px !== null && px === lengthToPx(second);
};

const canFitKind = (kind: StyleKind, value: string): boolean => {
  if (kind === "color") {
    return colorHex(value) !== null;
  }

  return lengthToPx(value) !== null;
};

const toHintRank = (candidate: Candidate): number =>
  Number(Boolean(candidate.hint));

const listVarCandidates = (
  row: StyleValueRow,
  vars: PageVar[]
): Candidate[] => {
  const found: Candidate[] = [];

  for (const pageVar of vars) {
    if (canFitKind(row.kind, pageVar.value)) {
      found.push({
        hint: toSameHint(isSameValue(row.kind, pageVar.value, row.value)),
        token: pageVar.name,
        value: pageVar.value,
      });
    }
  }

  return found.toSorted(
    (first, second) =>
      toHintRank(second) - toHintRank(first) ||
      first.token.localeCompare(second.token)
  );
};

const listUniqueTokens = (list: Candidate[]): Candidate[] => {
  const seen = new Set<string>();
  const unique: Candidate[] = [];

  for (const candidate of list) {
    if (!seen.has(candidate.token)) {
      seen.add(candidate.token);
      unique.push(candidate);
    }
  }

  return unique;
};

const isClassCandidate = (
  hit: StyleHit,
  cls: string,
  kind: StyleKind,
  seen: Map<string, Candidate>
): boolean =>
  !isRawClass(cls) && kindOf(hit.property) === kind && !seen.has(cls);

const listClassCandidates = (
  row: StyleValueRow,
  page: StyleHit[]
): Candidate[] => {
  const seen = new Map<string, Candidate>();

  for (const hit of page) {
    const { cls } = hit;

    if (cls && isClassCandidate(hit, cls, row.kind, seen)) {
      seen.set(cls, {
        hint: toSameHint(hit.value === row.value),
        token: cls,
        value: hit.value,
      });
    }
  }

  return [...seen.values()].toSorted(
    (first, second) =>
      Number(second.value === row.value) - Number(first.value === row.value) ||
      first.token.localeCompare(second.token)
  );
};

export {
  listClassCandidates,
  listDesignCandidates,
  listUniqueTokens,
  listVarCandidates,
  toShownValue,
};

export type { Candidate };
