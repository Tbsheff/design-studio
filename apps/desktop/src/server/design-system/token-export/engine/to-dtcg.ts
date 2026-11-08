import { toNumber } from "./to-number.js";
import { toAliasCount } from "./token-model.js";
import type {
  FormatOutput,
  PortableToken,
  PortableValue,
  SkippedToken,
} from "./token-model.js";

type JsonScalar = number | string;

interface JsonBranch {
  readonly [name: string]: JsonBranch | JsonScalar;
}

interface Placement {
  readonly leaf: JsonBranch;
  readonly segments: readonly string[];
}

interface Occupied {
  readonly leaves: Set<string>;
  readonly prefixes: Set<string>;
}

const JSON_INDENT = 2;

const toTypeName = (type: string): string | null => {
  const known = [
    "color",
    "dimension",
    "duration",
    "fontFamily",
    "fontWeight",
    "number",
    "shadow",
  ];

  if (known.includes(type)) {
    return type;
  }

  return null;
};

const toValueText = (value: PortableValue): string => {
  if (value.aliasPath !== null) {
    return `{${value.aliasPath}}`;
  }

  return value.text;
};

const toTypedValue = (type: string, value: PortableValue): JsonScalar => {
  const text = toValueText(value);

  if (value.aliasPath !== null) {
    return text;
  }

  if (type !== "fontWeight" && type !== "number") {
    return text;
  }

  return toNumber(text, type) ?? text;
};

const toTypedField = (type: string | null): JsonBranch => {
  if (type === null) {
    return {};
  }

  return { $type: type };
};

const toLeaf = (token: PortableToken): JsonBranch => {
  const type = toTypeName(token.type);
  const value = toTypedValue(token.type, token.light);
  const typed = toTypedField(type);

  if (token.dark === null) {
    return { ...typed, $value: value };
  }

  const dark = toTypedValue(token.type, token.dark);

  return {
    ...typed,
    $extensions: { "studio.modes": { dark } },
    $value: value,
  };
};

const toPrefixes = (segments: readonly string[]): readonly string[] =>
  segments
    .slice(0, -1)
    .map((_segment, index) => segments.slice(0, index + 1).join("."));

const toConflict = (
  occupied: Occupied,
  segments: readonly string[]
): string | null => {
  const full = segments.join(".");

  if (toPrefixes(segments).some((prefix) => occupied.leaves.has(prefix))) {
    return "name sits inside another token";
  }

  if (occupied.leaves.has(full) || occupied.prefixes.has(full)) {
    return "name clashes with another token";
  }

  return null;
};

const toOccupy = (occupied: Occupied, segments: readonly string[]): void => {
  occupied.leaves.add(segments.join("."));

  for (const prefix of toPrefixes(segments)) {
    occupied.prefixes.add(prefix);
  }
};

const toJson = (
  placements: readonly Placement[],
  depth: number
): JsonBranch => {
  const names = new Set(placements.map((item) => item.segments[depth] ?? ""));
  const entries: [string, JsonBranch][] = [];

  for (const name of names) {
    const members = placements.filter((item) => item.segments[depth] === name);
    const [first] = members;

    if (first?.segments.length === depth + 1) {
      entries.push([name, first.leaf]);
    } else {
      entries.push([name, toJson(members, depth + 1)]);
    }
  }

  return Object.fromEntries(entries);
};

const toDtcg = (tokens: readonly PortableToken[]): FormatOutput => {
  const occupied: Occupied = { leaves: new Set(), prefixes: new Set() };
  const skipped: SkippedToken[] = [];
  const kept: PortableToken[] = [];

  for (const token of tokens) {
    const reason = toConflict(occupied, token.segments);

    if (reason === null) {
      toOccupy(occupied, token.segments);
      kept.push(token);
    } else {
      skipped.push({ name: token.path, reason });
    }
  }

  const placements = kept.map((token) => ({
    leaf: toLeaf(token),
    segments: token.segments,
  }));

  const aliasCount = toAliasCount((value) => value.aliasPath !== null, kept);

  return {
    aliasCount,
    skipped,
    text: `${JSON.stringify(toJson(placements, 0), null, JSON_INDENT)}\n`,
    tokenCount: kept.length,
  };
};

export { toDtcg };
