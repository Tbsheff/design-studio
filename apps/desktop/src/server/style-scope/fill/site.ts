import { readFile } from "node:fs/promises";

import {
  elementClassInfo,
  resolveSource,
  themeForFile,
  tokenEntriesFor,
} from "./deps.js";
import type {
  CompiledTokenEntry,
  Direction,
  Project,
  SourceLoc,
  TailwindTheme,
} from "./deps.js";

interface FillScope {
  direction: Direction;
  project: Project;
  workTree: string;
}

interface FillSite {
  classes: string[];
  entries: CompiledTokenEntry[];
  file: string;
  mode: "classes" | "css";
  original: string;
  relative: string;
  tag: string;
  theme: TailwindTheme | null;
}

const TAG_MAX = 4000;

const toOffsetOf = (text: string, loc: SourceLoc): number => {
  const lines = text.split("\n").slice(0, loc.line - 1);
  const before = lines.reduce((sum, line) => sum + line.length + 1, 0);

  return before + Math.max(0, loc.col - 1);
};

const QUOTES = new Set(["'", '"', "`"]);

const BRACE_STEP = new Map<string, number>([
  ["{", 1],
  ["}", -1],
]);

interface ScanState {
  depth: number;
  quote: string | null;
}

const toScanQuoted = (state: ScanState, char: string): void => {
  if (char === state.quote) {
    state.quote = null;
  }
};

const toScanOpen = (state: ScanState, char: string): boolean => {
  if (QUOTES.has(char)) {
    state.quote = char;

    return false;
  }

  state.depth += BRACE_STEP.get(char) ?? 0;

  return char === ">" && state.depth === 0;
};

const toScanStep = (state: ScanState, char: string): boolean => {
  if (state.quote) {
    toScanQuoted(state, char);

    return false;
  }

  return toScanOpen(state, char);
};

const toTagEnd = (text: string): number => {
  const state: ScanState = { depth: 0, quote: null };

  for (let index = 0; index < text.length; index += 1) {
    const char = text.charAt(index);

    if (toScanStep(state, char)) {
      return index + 1;
    }
  }

  return text.length;
};

const toOpeningTag = (text: string, loc: SourceLoc): string => {
  const start = toOffsetOf(text, loc);
  const slice = text.slice(start, start + TAG_MAX);

  return slice.slice(0, toTagEnd(slice));
};

const toModeOf = (tailwind: boolean): FillSite["mode"] => {
  if (tailwind) {
    return "classes";
  }

  return "css";
};

const toLoadFillSite = async (
  scope: FillScope,
  loc: SourceLoc
): Promise<FillSite> => {
  const resolved = await resolveSource(scope.workTree, loc.file);

  const [text, info, entries] = await Promise.all([
    readFile(resolved.file, "utf-8"),
    elementClassInfo(scope.workTree, scope.project.kind, loc),
    tokenEntriesFor(scope.project, scope.direction),
  ]);

  const fileTheme = await themeForFile(
    scope.workTree,
    resolved.relative,
    text,
    {
      projectKind: scope.project.kind,
    }
  );

  const classes = info.tailwind?.classes ?? [];
  const tailwind = info.tailwind?.mode === "classes" && fileTheme !== null;

  return {
    classes,
    entries,
    file: resolved.file,
    mode: toModeOf(tailwind),
    original: text,
    relative: resolved.relative,
    tag: toOpeningTag(text, loc),
    theme: fileTheme,
  };
};

export { toLoadFillSite as loadFillSite };

export type { FillScope, FillSite };
