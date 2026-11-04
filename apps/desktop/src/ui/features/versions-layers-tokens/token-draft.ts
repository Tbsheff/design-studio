import type {
  CompiledTokenEntry,
  TokenChange,
  TokenFile,
} from "@design-studio/actions/_core/contracts";
import type { DesignTokens } from "../design-system/use-design-system-state.js";

export interface PendingToken {
  value?: string;
  darkValue?: string | null;
}

export type PendingMap = Record<string, PendingToken>;

export type TokenField = "value" | "darkValue";

export interface RawToken {
  value: string;
  darkValue: string | null;
}

const ALIAS_RE = /^\{([A-Za-z0-9_.-]+)\}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function aliasPath(value: string): string | null {
  return ALIAS_RE.exec(value.trim())?.[1] ?? null;
}

const VAR_RE = /^var\(\s*(--[A-Za-z0-9_-]+)\s*\)$/;

export function varTarget(value: string): string | null {
  return VAR_RE.exec(value.trim())?.[1] ?? null;
}

export function referencedEntry(
  value: string,
  entries: CompiledTokenEntry[]
): CompiledTokenEntry | null {
  const path = aliasPath(value);

  if (path) {
    return entries.find((item) => item.path === path) ?? null;
  }

  const cssVar = varTarget(value);

  return cssVar
    ? (entries.find((item) => item.cssVar === cssVar) ?? null)
    : null;
}

function darkOf(node: Record<string, unknown>): string | null {
  const ext = isRecord(node.$extensions)
    ? node.$extensions["studio.modes"]
    : undefined;

  return isRecord(ext) && typeof ext.dark === "string" ? ext.dark : null;
}

export function rawToken(
  file: TokenFile | null,
  entry: CompiledTokenEntry
): RawToken {
  if (entry.source) {
    return { darkValue: entry.source.darkValue, value: entry.source.value };
  }

  let node: unknown = file;

  for (const segment of entry.path.split(".")) {
    node = isRecord(node) ? node[segment] : undefined;
  }

  if (!isRecord(node) || typeof node.$value !== "string") {
    return { darkValue: entry.darkValue, value: entry.value };
  }

  return { darkValue: darkOf(node), value: node.$value };
}

export function shownRaw(
  base: RawToken,
  pending: PendingToken | undefined
): RawToken {
  return {
    darkValue:
      pending?.darkValue === undefined ? base.darkValue : pending.darkValue,
    value: pending?.value ?? base.value,
  };
}

export function withField(
  prev: PendingToken | undefined,
  field: TokenField,
  next: string | null,
  base: RawToken
): PendingToken | undefined {
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

  return out.value === undefined && out.darkValue === undefined
    ? undefined
    : out;
}

export function setPending(
  map: PendingMap,
  path: string,
  next: PendingToken | undefined
): PendingMap {
  const out = { ...map };

  if (next) {
    out[path] = next;
  } else {
    delete out[path];
  }

  return out;
}

export function toChanges(map: PendingMap): TokenChange[] {
  return Object.entries(map).map(([path, p]) => ({ path, ...p }));
}

export function errorPaths(
  messages: string[],
  changes: TokenChange[]
): Record<string, string> {
  const byLength = [...changes].sort((a, b) => b.path.length - a.path.length);
  const out: Record<string, string> = {};

  for (const message of messages) {
    const hit = byLength.find((change) => message.includes(change.path));

    if (hit && out[hit.path] === undefined) {
      out[hit.path] = message;
    }
  }

  return out;
}

function resolveCss(
  value: string,
  entries: CompiledTokenEntry[],
  dark: boolean
): string {
  const entry = referencedEntry(value, entries);

  if (!entry) {
    return value;
  }

  return dark && entry.darkValue ? entry.darkValue : entry.value;
}

function overlayEntry(
  entry: CompiledTokenEntry,
  pending: PendingToken,
  entries: CompiledTokenEntry[]
): CompiledTokenEntry {
  const value =
    pending.value === undefined
      ? entry.value
      : resolveCss(pending.value, entries, false);

  const darkValue =
    pending.darkValue === undefined
      ? entry.darkValue
      : pending.darkValue === null
        ? null
        : resolveCss(pending.darkValue, entries, true);

  return { ...entry, darkValue, value };
}

export function overlayTokens(
  tokens: DesignTokens | null,
  map: PendingMap
): DesignTokens | null {
  if (!tokens || Object.keys(map).length === 0) {
    return tokens;
  }

  const entries = tokens.entries.map((entry) =>
    map[entry.path]
      ? overlayEntry(entry, map[entry.path] as PendingToken, tokens.entries)
      : entry
  );

  return { ...tokens, entries };
}

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

function matchesQuery(
  entry: CompiledTokenEntry,
  raw: RawToken,
  query: string
): boolean {
  if (query === "") {
    return true;
  }

  const hay =
    `${entry.cssVar} ${entry.path} ${raw.value} ${raw.darkValue ?? ""}`.toLowerCase();

  return hay.includes(query);
}

export function tokenSections(
  entries: CompiledTokenEntry[],
  raw: (entry: CompiledTokenEntry) => RawToken,
  query: string
): TokenSection[] {
  const q = query.trim().toLowerCase();
  const visible = entries.filter((entry) => matchesQuery(entry, raw(entry), q));
  const known = new Set(SECTIONS.flatMap((s) => s.groups));

  const sections = SECTIONS.map((s) => ({
    entries: visible.filter((e) =>
      s.groups.includes(e.path.split(".")[0] ?? "")
    ),
    id: s.id,
    label: s.label,
  }));

  const other = {
    entries: visible.filter((e) => !known.has(e.path.split(".")[0] ?? "")),
    id: "other",
    label: "Other",
  };

  return [...sections, other].filter((s) => s.entries.length > 0);
}
