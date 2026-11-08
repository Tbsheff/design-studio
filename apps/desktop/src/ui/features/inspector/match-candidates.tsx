import type { CompiledTokenEntry } from "@design-studio/contracts";
import { TOKEN_GROUP_FOR_PROPERTY } from "@design-studio/contracts";
import { isRawClass, kindOf } from "@design-studio/contracts/style-search";
import type {
  StyleHit,
  StyleKind,
  StyleValueRow,
} from "@design-studio/contracts/style-search";
import type { ReactElement } from "react";

import {
  colorHex,
  lengthToPx,
  matchForProperty,
} from "../../../shared/token-match.js";
import type { TokenMode } from "../../../shared/token-match.js";
import { copy } from "./copy.js";
import type { PageVar } from "./match-scan.js";

const toShownValue = (row: Pick<StyleValueRow, "kind" | "value">): string =>
  row.kind === "color" ? (colorHex(row.value) ?? row.value) : row.value;

const StateTag = ({
  row,
  onReplace,
}: {
  readonly row: StyleValueRow;
  readonly onReplace: () => void;
}): ReactElement => {
  if (row.state === "raw") {
    return (
      <button
        type="button"
        className="sm-tag raw"
        style={{ border: 0, cursor: "pointer" }}
        aria-label={`Replace ${toShownValue(row)} with a token`}
        data-tip={copy.notATokenReplaceIt}
        onClick={onReplace}
      >
        {copy.raw}
      </button>
    );
  }

  if (row.state === "palette") {
    return (
      <span
        className="sm-tag mixed"
        data-tip={`Tailwind palette class ${row.tokens.join(", ")}, not a project token`}
      >
        {row.tokens[0] ?? "palette"}
      </span>
    );
  }

  const token = row.tokens[0] ?? "";
  const more = row.tokens.length > 1 ? ` +${row.tokens.length - 1}` : "";

  return (
    <span
      className={`sm-tag ${row.state === "mixed" ? "mixed" : "token"}`}
      data-tip={
        row.state === "mixed"
          ? "Some elements use a token, some a raw value"
          : `Token ${row.tokens.join(", ")}`
      }
    >
      {token}
      {more}
    </span>
  );
};

interface Candidate {
  readonly token: string;
  readonly value: string;
  readonly hint: string;
}

const listDesignCandidates = (
  row: StyleValueRow,
  entries: CompiledTokenEntry[],
  mode: TokenMode
): Candidate[] => {
  const property = row.properties[0];

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

const canFitKind = (kind: StyleKind, value: string): boolean =>
  kind === "color" ? colorHex(value) !== null : lengthToPx(value) !== null;

const listVarCandidates = (row: StyleValueRow, vars: PageVar[]): Candidate[] =>
  vars
    .filter((pageVar) => canFitKind(row.kind, pageVar.value))
    .map((pageVarValue) => ({
      hint: isSameValue(row.kind, pageVarValue.value, row.value)
        ? "same value"
        : "",
      token: pageVarValue.name,
      value: pageVarValue.value,
    }))
    .sort(
      (first, second) =>
        Number(Boolean(second.hint)) - Number(Boolean(first.hint)) ||
        first.token.localeCompare(second.token)
    );

const listUniqueTokens = (list: Candidate[]): Candidate[] => {
  const seen = new Set<string>();

  return list.filter(
    (candidate) =>
      !seen.has(candidate.token) && Boolean(seen.add(candidate.token))
  );
};

const listClassCandidates = (
  row: StyleValueRow,
  page: StyleHit[]
): Candidate[] => {
  const seen = new Map<string, Candidate>();

  for (const hit of page) {
    if (
      !hit.cls ||
      isRawClass(hit.cls) ||
      kindOf(hit.property) !== row.kind ||
      seen.has(hit.cls)
    ) {
      continue;
    }

    seen.set(hit.cls, {
      hint: hit.value === row.value ? "same value" : "",
      token: hit.cls,
      value: hit.value,
    });
  }

  return [...seen.values()].sort(
    (first, second) =>
      Number(second.value === row.value) - Number(first.value === row.value) ||
      first.token.localeCompare(second.token)
  );
};

const Swatch = ({
  kind,
  value,
}: {
  readonly kind: StyleKind;
  readonly value: string;
}): ReactElement | null => {
  if (kind !== "color") {
    return null;
  }

  return (
    <span
      className="sm-swatch"
      style={{ background: value }}
      aria-hidden="true"
    />
  );
};

export {
  StateTag,
  Swatch,
  listClassCandidates,
  listDesignCandidates,
  toShownValue,
  listUniqueTokens,
  listVarCandidates,
};

export type { Candidate };
