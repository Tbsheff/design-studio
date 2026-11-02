const TEXT_SEARCH_QUERY_MAX = 200;

const TEXT_SEARCH_REPLACE_MAX = 2000;

const TEXT_SEARCH_GLOB_MAX = 200;

const TEXT_SEARCH_HITS_MAX = 500;

const TEXT_SEARCH_IDS_MAX = 500;

const TEXT_SEARCH_FILES_MAX = 400;

const TEXT_SEARCH_FILE_BYTES_MAX = 1_000_000;

const TEXT_SEARCH_ATTRIBUTES = [
  "alt",
  "placeholder",
  "title",
  "aria-label",
] as const;

type TextSearchAttribute = (typeof TEXT_SEARCH_ATTRIBUTES)[number];

type TextHitKind = "text" | "attribute" | "literal";

interface TextSearchQuery {
  readonly query: string;
  readonly caseSensitive: boolean;
  readonly wholeWord: boolean;
  readonly regex: boolean;
  readonly glob: string | null;
}

interface TextLayer {
  readonly file: string;
  readonly line: number;
  readonly col: number;
  readonly tag: string;
}

interface TextHit {
  readonly id: string;
  readonly file: string;
  readonly line: number;
  readonly col: number;
  readonly kind: TextHitKind;
  readonly attribute: string | null;
  readonly match: string;
  readonly snippet: string;
  readonly layer: TextLayer;
  readonly frame: string | null;
}

interface TextSkip {
  readonly file: string;
  readonly reason: string;
}

interface TextSearchResult {
  readonly hits: readonly TextHit[];
  readonly total: number;
  readonly truncated: boolean;
  readonly files: number;
  readonly skipped: readonly TextSkip[];
}

interface TextUpdateRequest extends TextSearchQuery {
  readonly replace: string;
  readonly ids: readonly string[] | null;
}

interface TextUpdateResult {
  readonly updated: number;
  readonly files: readonly string[];
  readonly stale: readonly string[];
  readonly skipped: readonly TextSkip[];
  readonly versionId: string | null;
}

export {
  TEXT_SEARCH_ATTRIBUTES,
  TEXT_SEARCH_FILE_BYTES_MAX,
  TEXT_SEARCH_FILES_MAX,
  TEXT_SEARCH_GLOB_MAX,
  TEXT_SEARCH_HITS_MAX,
  TEXT_SEARCH_IDS_MAX,
  TEXT_SEARCH_QUERY_MAX,
  TEXT_SEARCH_REPLACE_MAX,
};

export type {
  TextHit,
  TextHitKind,
  TextLayer,
  TextSearchAttribute,
  TextSearchQuery,
  TextSearchResult,
  TextSkip,
  TextUpdateRequest,
  TextUpdateResult,
};
