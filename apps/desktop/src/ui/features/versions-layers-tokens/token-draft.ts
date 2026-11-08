import type {
  CompiledTokenEntry,
  TokenChange,
  TokenFile,
} from "@design-studio/contracts";

import type { DesignTokens } from "../design-system/use-design-system-state.js";

interface PendingToken {
  value?: string;
  darkValue?: string | null;
}

type PendingMap = Record<string, PendingToken>;

type TokenField = "value" | "darkValue";

interface RawToken {
  value: string;
  darkValue: string | null;
}

const ALIAS_RE = /^\{(?<path>[A-Za-z0-9_.-]+)\}$/u;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

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

const darkOf = (node: Record<string, unknown>): string | null => {
  const { $extensions: modes } = node;

  if (!isRecord(modes)) {
    return null;
  }

  const { "studio.modes": ext } = modes;

  if (isRecord(ext) && typeof ext.dark === "string") {
    return ext.dark;
  }

  return null;
};

const rawToken = (
  file: TokenFile | null,
  entry: CompiledTokenEntry
): RawToken => {
  if (entry.source) {
    return { darkValue: entry.source.darkValue, value: entry.source.value };
  }

  let node: unknown = file;

  for (const segment of entry.path.split(".")) {
    if (isRecord(node)) {
      node = node[segment];
    }
  }

  if (!isRecord(node) || typeof node.$value !== "string") {
    return { darkValue: entry.darkValue, value: entry.value };
  }

  return { darkValue: darkOf(node), value: node.$value };
};

const shownRaw = (
  base: RawToken,
  pending: PendingToken | undefined
): RawToken => {
  let { darkValue } = base;

  const pendingDark = pending?.darkValue;

  if (pendingDark !== undefined) {
    darkValue = pendingDark;
  }

  return { darkValue, value: pending?.value ?? base.value };
};

const withField = (
  prev: PendingToken | undefined,
  field: TokenField,
  next: string | null,
  base: RawToken
): PendingToken | undefined => {
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

  if (out.value === undefined && out.darkValue === undefined) {
    return;
  }

  return out;
};

const setPending = (
  map: PendingMap,
  path: string,
  next: PendingToken | undefined
): PendingMap => {
  const rest = Object.fromEntries(
    Object.entries(map).filter(([key]) => key !== path)
  );

  if (next) {
    return { ...rest, [path]: next };
  }

  return rest;
};

const toChanges = (map: PendingMap): TokenChange[] =>
  Object.entries(map).map(([path, pending]) => ({ path, ...pending }));

const errorPaths = (
  messages: string[],
  changes: TokenChange[]
): Record<string, string> => {
  const byLength = [...changes].sort(
    (first, second) => second.path.length - first.path.length
  );

  const out: Record<string, string> = {};

  for (const message of messages) {
    const hit = byLength.find((change) => message.includes(change.path));

    if (hit && !(hit.path in out)) {
      out[hit.path] = message;
    }
  }

  return out;
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

  if (pending.value !== undefined) {
    value = resolveCss(pending.value, entries, false);
  }

  if (pending.darkValue !== undefined) {
    darkValue = null;

    if (pending.darkValue !== null) {
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
  setPending,
  toChanges,
  errorPaths,
  overlayTokens,
  tokenSections,
};

export type { PendingToken, PendingMap, TokenField, RawToken };
