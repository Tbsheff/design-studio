import type {
  CompiledTokenEntry,
  DesignToken,
  TokenChange,
  TokenFile,
  TokenGroup,
} from "@design-studio/contracts";

import { isText } from "../../platform/json-guard.js";
import type { DesignTokens } from "../design-system/use-design-system-state.js";

interface PendingToken {
  value?: string;
  darkValue?: string | null;
}

type PendingMap = Record<string, PendingToken>;

type PathMessages = Record<string, string>;

type TokenField = "value" | "darkValue";

interface RawToken {
  value: string;
  darkValue: string | null;
}

const ALIAS_RE = /^\{(?<path>[A-Za-z0-9_.-]+)\}$/u;

const aliasPath = (value: string): string | null =>
  ALIAS_RE.exec(value.trim())?.groups?.path ?? null;

const VAR_RE = /^var\(\s*(?<cssVar>--[A-Za-z0-9_-]+)\s*\)$/u;

const varTarget = (value: string): string | null =>
  VAR_RE.exec(value.trim())?.groups?.cssVar ?? null;

const referencedEntry = (
  value: string,
  entries: CompiledTokenEntry[]
): CompiledTokenEntry | null => {
  const path = aliasPath(value);

  if (path) {
    return entries.find((item) => item.path === path) ?? null;
  }

  const cssVar = varTarget(value);

  if (!cssVar) {
    return null;
  }

  return entries.find((item) => item.cssVar === cssVar) ?? null;
};

type TokenNode = DesignToken | TokenFile | TokenGroup;

const isLeaf = (node: TokenNode): node is DesignToken => "$value" in node;

const findNode = (file: TokenFile | null, path: string): TokenNode | null => {
  let node: TokenNode | null = file;

  for (const segment of path.split(".")) {
    if (node === null || isLeaf(node)) {
      return null;
    }

    const next: TokenNode | string | undefined = node[segment];
    node = null;

    if (next && !isText(next)) {
      node = next;
    }
  }

  return node;
};

const rawToken = (
  file: TokenFile | null,
  entry: CompiledTokenEntry
): RawToken => {
  if (entry.source) {
    return { darkValue: entry.source.darkValue, value: entry.source.value };
  }

  const node = findNode(file, entry.path);

  if (!node || !isLeaf(node)) {
    return { darkValue: entry.darkValue, value: entry.value };
  }

  const darkValue = node.$extensions?.["studio.modes"]?.dark ?? null;

  return { darkValue, value: node.$value };
};

const shownRaw = (base: RawToken, pending: PendingToken | null): RawToken => {
  let { darkValue } = base;

  if (pending && "darkValue" in pending) {
    darkValue = pending.darkValue ?? null;
  }

  return { darkValue, value: pending?.value ?? base.value };
};

const withField = (
  prev: PendingToken | null,
  field: TokenField,
  next: string | null,
  base: RawToken
): PendingToken | null => {
  const out: PendingToken = { ...prev };

  if (field === "value") {
    if (next === null || next === base.value) {
      delete out.value;
    } else {
      out.value = next;
    }
  } else if (next === base.darkValue) {
    delete out.darkValue;
  } else {
    out.darkValue = next;
  }

  if (!("value" in out) && !("darkValue" in out)) {
    return null;
  }

  return out;
};

const withPending = (
  map: PendingMap,
  path: string,
  next: PendingToken | null
): PendingMap => {
  const result: PendingMap = Object.fromEntries(
    Object.entries(map).filter(([key]) => key !== path)
  );

  if (next) {
    result[path] = next;
  }

  return result;
};

const toChanges = (map: PendingMap): TokenChange[] => {
  const changes: TokenChange[] = [];

  for (const [path, pending] of Object.entries(map)) {
    changes.push({ path, ...pending });
  }

  return changes;
};

const errorPaths = (
  messages: string[],
  changes: TokenChange[]
): PathMessages => {
  const byLength = changes.toSorted(
    (first, second) => second.path.length - first.path.length
  );

  const hits = new Map<string, string>();

  for (const message of messages) {
    const hit = byLength.find((change) => message.includes(change.path));

    if (hit && !hits.has(hit.path)) {
      hits.set(hit.path, message);
    }
  }

  const result: PathMessages = Object.fromEntries(hits);

  return result;
};

const resolveCss = (
  value: string,
  entries: CompiledTokenEntry[],
  dark: boolean
): string => {
  const entry = referencedEntry(value, entries);

  if (!entry) {
    return value;
  }

  if (dark && entry.darkValue) {
    return entry.darkValue;
  }

  return entry.value;
};

const overlayEntry = (
  entry: CompiledTokenEntry,
  pending: PendingToken,
  entries: CompiledTokenEntry[]
): CompiledTokenEntry => {
  let { value } = entry;
  let { darkValue } = entry;

  if ("value" in pending) {
    value = resolveCss(pending.value ?? entry.value, entries, false);
  }

  if ("darkValue" in pending) {
    darkValue = null;

    if (pending.darkValue) {
      darkValue = resolveCss(pending.darkValue, entries, true);
    }
  }

  return { ...entry, darkValue, value };
};

const overlayTokens = (
  tokens: DesignTokens | null,
  map: PendingMap
): DesignTokens | null => {
  if (!tokens || Object.keys(map).length === 0) {
    return tokens;
  }

  const entries = tokens.entries.map((entry) => {
    const pending = map[entry.path];

    if (pending) {
      return overlayEntry(entry, pending, tokens.entries);
    }

    return entry;
  });

  return { ...tokens, entries };
};

interface TokenSection {
  id: string;
  label: string;
  entries: CompiledTokenEntry[];
}

const SECTIONS: { id: string; label: string; groups: string[] }[] = [
  { groups: ["color"], id: "color", label: "Color" },
  { groups: ["font", "text"], id: "type", label: "Typography" },
  { groups: ["space"], id: "space", label: "Space" },
  { groups: ["radius"], id: "radius", label: "Radius" },
  { groups: ["shadow"], id: "shadow", label: "Shadow" },
  { groups: ["breakpoint"], id: "breakpoint", label: "Breakpoints" },
];

const matchesQuery = (
  entry: CompiledTokenEntry,
  raw: RawToken,
  query: string
): boolean => {
  if (query === "") {
    return true;
  }

  const haystack =
    `${entry.cssVar} ${entry.path} ${raw.value} ${raw.darkValue ?? ""}`.toLowerCase();

  return haystack.includes(query);
};

const tokenSections = (
  entries: CompiledTokenEntry[],
  raw: (entry: CompiledTokenEntry) => RawToken,
  query: string
): TokenSection[] => {
  const needle = query.trim().toLowerCase();

  const visible = entries.filter((entry) =>
    matchesQuery(entry, raw(entry), needle)
  );

  const known = new Set(SECTIONS.flatMap((section) => section.groups));

  const sections = SECTIONS.map((section) => ({
    entries: visible.filter((entry) =>
      section.groups.includes(entry.path.split(".")[0] ?? "")
    ),
    id: section.id,
    label: section.label,
  }));

  const other = {
    entries: visible.filter(
      (entry) => !known.has(entry.path.split(".")[0] ?? "")
    ),
    id: "other",
    label: "Other",
  };

  return [...sections, other].filter((section) => section.entries.length > 0);
};

export {
  aliasPath,
  varTarget,
  referencedEntry,
  rawToken,
  shownRaw,
  withField,
  withPending,
  toChanges,
  errorPaths,
  overlayTokens,
  tokenSections,
};

export type { PendingToken, PendingMap, TokenField, RawToken };
