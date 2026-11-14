import { readFile, stat } from "node:fs/promises";

import { TEXT_SEARCH_FILE_BYTES_MAX, assertCanEdit } from "./deps.js";
import { TextSearchError } from "./errors.js";
import { layerExtent } from "./range-extent.js";
import { htmlSegments } from "./scan-html.js";
import { jsxSegments } from "./scan-jsx.js";
import { scopeOf } from "./scope.js";
import type { ScopeFile, SearchTarget } from "./scope.js";
import type { Segment } from "./segment.js";
import { commitChanged } from "./update-text.js";
import type { ChangedFile, UpdateCommit } from "./update-text.js";
import { wrapRange } from "./wrap-range.js";
import type { RangeOutcome, RangeStyle } from "./wrap-range.js";

interface TextRangeRequest {
  readonly className: string | null;
  readonly end: number;
  readonly href: string | null;
  readonly isRemove: boolean;
  readonly layer: {
    readonly column: number;
    readonly file: string;
    readonly line: number;
  };
  readonly start: number;
  readonly style: RangeStyle;
  readonly text: string | null;
}

interface TextRangeResult {
  readonly file: string;
  readonly versionId: string | null;
}

const STYLE_NAMES = {
  bold: "bold",
  class: "color",
  italic: "italic",
  link: "link",
  strike: "strikethrough",
  underline: "underline",
} as const satisfies Readonly<Record<TextRangeRequest["style"], string>>;

const toReadSource = async (file: ScopeFile): Promise<string> => {
  const info = await stat(file.absolute);

  if (!info.isFile() || info.size > TEXT_SEARCH_FILE_BYTES_MAX) {
    throw new TextSearchError("The file could not be read.");
  }

  return await readFile(file.absolute, "utf-8");
};

const toSegmentsOf = (relative: string, source: string): Segment[] => {
  if (/\.html?$/iu.test(relative)) {
    return htmlSegments(relative, source);
  }

  return jsxSegments(relative, source);
};

const isOwnSegment = (request: TextRangeRequest, segment: Segment): boolean =>
  segment.layer.line === request.layer.line &&
  segment.layer.col === request.layer.column;

const toStartOf = (segment: Segment): number => segment.pieces[0]?.start ?? 0;

const toLayerSegments = (
  request: TextRangeRequest,
  source: string
): Segment[] => {
  const texts = toSegmentsOf(request.layer.file, source).filter(
    (segment) => segment.kind === "text"
  );

  const own = texts.filter((segment) => isOwnSegment(request, segment));

  const extent = layerExtent(
    request.layer.file,
    source,
    request.layer.line,
    request.layer.column
  );

  if (extent === null) {
    return own;
  }

  return texts
    .filter(
      (segment) =>
        isOwnSegment(request, segment) ||
        (toStartOf(segment) >= extent.openEnd &&
          toStartOf(segment) < extent.closeStart)
    )
    .toSorted((left, right) => toStartOf(left) - toStartOf(right));
};

const toOutcomeOf = (
  file: ScopeFile,
  source: string,
  request: TextRangeRequest
): RangeOutcome => {
  const segments = toLayerSegments(request, source);

  if (segments.length === 0) {
    return {
      isOk: false,
      message: "This layer has no text of its own. Select a text layer.",
    };
  }

  return wrapRange(file.relative, source, segments, {
    className: request.className,
    column: request.layer.column,
    end: request.end,
    href: request.href,
    isRemove: request.isRemove,
    line: request.layer.line,
    start: request.start,
    style: request.style,
    text: request.text,
  });
};

const toTitleOf = (request: TextRangeRequest): string => {
  const name = STYLE_NAMES[request.style];

  if (request.isRemove) {
    return `Remove ${name} from text`;
  }

  return `Apply ${name} to text`;
};

const toChangedFile = async (
  target: SearchTarget,
  request: TextRangeRequest
): Promise<ChangedFile> => {
  const scope = await scopeOf(target, request.layer.file);
  const file = scope.files.find((item) => item.relative === request.layer.file);

  if (!file) {
    throw new TextSearchError("The file of this layer was not found.");
  }

  const original = await toReadSource(file);
  let outcome: RangeOutcome | null = null;

  try {
    outcome = toOutcomeOf(file, original, request);
  } catch {
    throw new TextSearchError("The file could not be parsed.");
  }

  if (!outcome.isOk) {
    throw new TextSearchError(outcome.message);
  }

  return {
    absolute: file.absolute,
    after: outcome.code,
    before: original,
    relative: file.relative,
  };
};

const applyTextRange = async (
  target: SearchTarget,
  request: TextRangeRequest,
  commit: UpdateCommit
): Promise<TextRangeResult> => {
  assertCanEdit(commit.deps, target.project, target.direction);
  const changed = await toChangedFile(target, request);

  const version = await commitChanged(
    target,
    [changed],
    toTitleOf(request),
    commit
  );

  return { file: changed.relative, versionId: version.id };
};

export { applyTextRange };

export type { TextRangeRequest, TextRangeResult };
