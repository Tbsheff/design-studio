import type { TextHit, TextSearchQuery } from "./deps.js";

interface SearchOptions {
  readonly caseSensitive: boolean;
  readonly regex: boolean;
  readonly wholeWord: boolean;
}

interface HitGroup {
  readonly file: string;
  readonly frame: string | null;
  readonly hits: readonly TextHit[];
  readonly key: string;
}

interface SnippetParts {
  readonly after: string;
  readonly before: string;
  readonly match: string;
}

type OptionName = keyof SearchOptions;

const OPTION_NAMES: readonly OptionName[] = [
  "caseSensitive",
  "wholeWord",
  "regex",
];

const DEFAULT_OPTIONS: SearchOptions = {
  caseSensitive: false,
  regex: false,
  wholeWord: false,
};

const toQuery = (text: string, options: SearchOptions): TextSearchQuery => ({
  caseSensitive: options.caseSensitive,
  glob: null,
  query: text,
  regex: options.regex,
  wholeWord: options.wholeWord,
});

const groupKey = (hit: TextHit): string => `${hit.frame ?? ""}|${hit.file}`;

const toGroups = (hits: readonly TextHit[]): HitGroup[] => {
  const byKey = new Map<string, TextHit[]>();

  for (const hit of hits) {
    const key = groupKey(hit);
    const list = byKey.get(key) ?? [];

    list.push(hit);
    byKey.set(key, list);
  }

  return [...byKey.entries()].map(([key, list]) => ({
    file: list[0]?.file ?? "",
    frame: list[0]?.frame ?? null,
    hits: list,
    key,
  }));
};

const isQueryReady = (query: string): boolean => query.trim() !== "";

const locOf = (hit: TextHit): string =>
  `${hit.layer.file}:${hit.layer.line}:${hit.layer.col}`;

const splitSnippet = (hit: TextHit): SnippetParts => {
  const at = hit.snippet.indexOf(hit.match);

  if (at === -1) {
    return { after: "", before: hit.snippet, match: "" };
  }

  return {
    after: hit.snippet.slice(at + hit.match.length),
    before: hit.snippet.slice(0, at),
    match: hit.match,
  };
};

export {
  DEFAULT_OPTIONS,
  isQueryReady,
  locOf,
  OPTION_NAMES,
  splitSnippet,
  toGroups,
  toQuery,
};

export type { HitGroup, OptionName, SearchOptions, SnippetParts };
