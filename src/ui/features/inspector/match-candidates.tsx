import type { CompiledTokenEntry } from "../../../shared/contracts.js";
import { TOKEN_GROUP_FOR_PROPERTY } from "../../../shared/contracts.js";
import {
  isRawClass,
  kindOf,
  type StyleHit,
  type StyleKind,
  type StyleValueRow,
} from "../../../shared/style-search.js";
import {
  colorHex,
  lengthToPx,
  matchForProperty,
  type TokenMode,
} from "../../../shared/token-match.js";
import type { PageVar } from "./match-scan.js";

function shownValue(row: Pick<StyleValueRow, "kind" | "value">): string {
  return row.kind === "color" ? (colorHex(row.value) ?? row.value) : row.value;
}

function StateTag({
  row,
  onReplace,
}: {
  row: StyleValueRow;
  onReplace: () => void;
}) {
  if (row.state === "raw") {
    return (
      <button
        type="button"
        className="sm-tag raw"
        style={{ border: 0, cursor: "pointer" }}
        aria-label={`Replace ${shownValue(row)} with a token`}
        data-tip="Not a token. Replace it with one"
        onClick={onReplace}
      >
        raw
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
}

interface Candidate {
  token: string;
  value: string;
  hint: string;
}

function designCandidates(
  row: StyleValueRow,
  entries: CompiledTokenEntry[],
  mode: TokenMode
): Candidate[] {
  const property = row.properties[0];

  if (!property || !TOKEN_GROUP_FOR_PROPERTY[property]) {
    return [];
  }

  return matchForProperty(property, row.value, entries, mode).map((match) => ({
    token: match.cssVar,
    value: match.value,
    hint: match.path,
  }));
}

function sameValue(kind: StyleKind, a: string, b: string): boolean {
  if (kind === "color") {
    return colorHex(a) !== null && colorHex(a) === colorHex(b);
  }

  const px = lengthToPx(a);

  return px !== null && px === lengthToPx(b);
}

function fitsKind(kind: StyleKind, value: string): boolean {
  return kind === "color"
    ? colorHex(value) !== null
    : lengthToPx(value) !== null;
}

function varCandidates(row: StyleValueRow, vars: PageVar[]): Candidate[] {
  return vars
    .filter((v) => fitsKind(row.kind, v.value))
    .map((v) => ({
      token: v.name,
      value: v.value,
      hint: sameValue(row.kind, v.value, row.value) ? "same value" : "",
    }))
    .sort(
      (a, b) =>
        Number(Boolean(b.hint)) - Number(Boolean(a.hint)) ||
        a.token.localeCompare(b.token)
    );
}

function uniqueTokens(list: Candidate[]): Candidate[] {
  const seen = new Set<string>();

  return list.filter((c) => !seen.has(c.token) && Boolean(seen.add(c.token)));
}

function classCandidates(row: StyleValueRow, page: StyleHit[]): Candidate[] {
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
      token: hit.cls,
      value: hit.value,
      hint: hit.value === row.value ? "same value" : "",
    });
  }

  return [...seen.values()].sort(
    (a, b) =>
      Number(b.value === row.value) - Number(a.value === row.value) ||
      a.token.localeCompare(b.token)
  );
}

function Swatch({ kind, value }: { kind: StyleKind; value: string }) {
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
}

export { StateTag, Swatch, designCandidates, shownValue, uniqueTokens };

export type { Candidate };
