import { readFile, stat } from "node:fs/promises";

import { TEXT_SEARCH_FILE_BYTES_MAX, TEXT_SEARCH_HITS_MAX } from "./deps.js";
import type {
  TextHit,
  TextSearchQuery,
  TextSearchResult,
  TextSkip,
} from "./deps.js";
import { findAll, toMatcher } from "./match.js";
import type { Found } from "./match.js";
import { lineStartsOf, positionAt } from "./position.js";
import { htmlSegments } from "./scan-html.js";
import { jsxSegments } from "./scan-jsx.js";
import { scopeOf } from "./scope.js";
import type { ScopeFile, SearchTarget } from "./scope.js";
import { rawStartOf } from "./segment.js";
import type { Segment } from "./segment.js";

interface FoundHit {
  readonly hit: TextHit;
  readonly segment: Segment;
  readonly found: Found;
}

interface FileScan {
  readonly file: ScopeFile;
  readonly source: string;
  readonly hits: readonly FoundHit[];
}

interface Collected {
  readonly scans: readonly FileScan[];
  readonly skipped: readonly TextSkip[];
  readonly files: number;
}

const SNIPPET_SIDE = 40;

const segmentsOf = (relative: string, source: string): Segment[] => {
  if (/\.html?$/iu.test(relative)) {
    return htmlSegments(relative, source);
  }

  return jsxSegments(relative, source);
};

const snippetOf = (text: string, found: Found): string => {
  const from = Math.max(0, found.start - SNIPPET_SIDE);
  const to = Math.min(text.length, found.end + SNIPPET_SIDE);
  let snippet = text.slice(from, to).replaceAll(/\s+/gu, " ").trim();

  if (from > 0) {
    snippet = `…${snippet}`;
  }

  if (to < text.length) {
    snippet = `${snippet}…`;
  }

  return snippet;
};

const hitsOf = (
  file: ScopeFile,
  source: string,
  segments: readonly Segment[],
  matcher: RegExp
): FoundHit[] => {
  const starts = lineStartsOf(source);
  const hits: FoundHit[] = [];

  for (const segment of segments) {
    for (const found of findAll(segment.text, matcher)) {
      const position = positionAt(starts, rawStartOf(segment, found.start));

      const hit: TextHit = {
        attribute: segment.attribute,
        col: position.col,
        file: file.relative,
        frame: file.frame,
        id: `${file.relative}:${position.line}:${position.col}`,
        kind: segment.kind,
        layer: segment.layer,
        line: position.line,
        match: found.text,
        snippet: snippetOf(segment.text, found),
      };

      hits.push({ found, hit, segment });
    }
  }

  return hits;
};

type SourceRead =
  | { readonly isRead: true; readonly source: string }
  | { readonly isRead: false; readonly skip: TextSkip };

const skipOf = (file: ScopeFile, reason: string): SourceRead => ({
  isRead: false,
  skip: { file: file.relative, reason },
});

const readSource = async (file: ScopeFile): Promise<SourceRead> => {
  try {
    const info = await stat(file.absolute);

    if (!info.isFile()) {
      return skipOf(file, "the file could not be read");
    }

    if (info.size > TEXT_SEARCH_FILE_BYTES_MAX) {
      return skipOf(file, "the file is too large");
    }

    return { isRead: true, source: await readFile(file.absolute, "utf-8") };
  } catch {
    return skipOf(file, "the file could not be read");
  }
};

const scanFile = async (
  file: ScopeFile,
  matcher: RegExp
): Promise<FileScan | TextSkip> => {
  const read = await readSource(file);

  if (!read.isRead) {
    return read.skip;
  }

  const { source } = read;

  try {
    const segments = segmentsOf(file.relative, source);
    const hits = hitsOf(file, source, segments, matcher);

    return { file, hits, source };
  } catch (error) {
    return {
      file: file.relative,
      reason: `the file could not be parsed: ${String(error)}`,
    };
  }
};

const collectHits = async (
  target: SearchTarget,
  query: TextSearchQuery
): Promise<Collected> => {
  const matcher = toMatcher(query);
  const scope = await scopeOf(target, query.glob);

  const results = await Promise.all(
    scope.files.map((file) => scanFile(file, matcher))
  );

  const scans: FileScan[] = [];
  const skipped: TextSkip[] = [...scope.skipped];

  for (const scanned of results) {
    if ("reason" in scanned) {
      skipped.push(scanned);
    } else {
      scans.push(scanned);
    }
  }

  return { files: scope.files.length, scans, skipped };
};

const searchText = async (
  target: SearchTarget,
  query: TextSearchQuery
): Promise<TextSearchResult> => {
  const collected = await collectHits(target, query);

  const hits = collected.scans.flatMap((scan) =>
    scan.hits.map((item) => item.hit)
  );

  return {
    files: collected.files,
    hits: hits.slice(0, TEXT_SEARCH_HITS_MAX),
    skipped: collected.skipped,
    total: hits.length,
    truncated: hits.length > TEXT_SEARCH_HITS_MAX,
  };
};

export { collectHits, searchText };

export type { Collected, FileScan, FoundHit };
