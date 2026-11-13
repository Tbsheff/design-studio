import {
  ACCESSIBILITY_LIST_MAX,
  accessibilityRoutes,
  call,
  replaceStyle,
} from "./deps.js";
import type {
  AccessibilityChanges,
  AccessibilityReport,
  AccessibilitySetResult,
  ContrastFix,
  SelectionContext,
  StyleReplaceResult,
} from "./deps.js";
import type { ReaderLine } from "./reader-model.js";

interface AccessibilityIds {
  readonly directionId: string;
  readonly projectId: string;
}

interface InspectQuery {
  readonly frame: string | null;
  readonly passing: boolean;
  readonly selector: string | null;
}

const NO_SOURCE = "The layer has no source location.";

const READER_PAGE = 200;

const READER_PAGES_MAX = 10;

const readAccessibility = (
  ids: AccessibilityIds,
  query: InspectQuery
): Promise<AccessibilityReport> =>
  call(accessibilityRoutes.inspectAccessibility, {
    directionId: ids.directionId,
    frame: query.frame,
    includePassing: query.passing,
    limit: ACCESSIBILITY_LIST_MAX,
    projectId: ids.projectId,
    selector: query.selector,
  });

const readReaderPages = async (
  ids: AccessibilityIds,
  frameId: string,
  pageCursor: string | null,
  pagesLeft: number
): Promise<ReaderLine[]> => {
  const page = await call(accessibilityRoutes.listReaderLinesAccessibility, {
    cursor: pageCursor,
    directionId: ids.directionId,
    frame: frameId,
    limit: READER_PAGE,
    projectId: ids.projectId,
  });

  if (page.next === null || pagesLeft <= 1) {
    return [...page.items];
  }

  const rest = await readReaderPages(ids, frameId, page.next, pagesLeft - 1);

  return [...page.items, ...rest];
};

const readReaderLines = (
  ids: AccessibilityIds,
  frame: string
): Promise<ReaderLine[]> => readReaderPages(ids, frame, null, READER_PAGES_MAX);

const writeAccessibility = (
  ids: AccessibilityIds,
  target: SelectionContext,
  changes: AccessibilityChanges
): Promise<AccessibilitySetResult> => {
  if (target.source === null) {
    return Promise.reject(new Error(NO_SOURCE));
  }

  return call(accessibilityRoutes.setAccessibility, {
    ...changes,
    directionId: ids.directionId,
    projectId: ids.projectId,
    target: {
      selector: target.selector,
      source: target.source,
      tag: target.tag,
      usedAt: target.usedAt ?? null,
    },
  });
};

const applyContrastFix = (
  ids: AccessibilityIds,
  fix: ContrastFix
): Promise<StyleReplaceResult> =>
  replaceStyle(ids.projectId, ids.directionId, {
    matches: fix.matches.map((match) => ({ ...match })),
    token: fix.token,
  });

export {
  applyContrastFix,
  readAccessibility,
  readReaderLines,
  writeAccessibility,
};

export type { AccessibilityIds, InspectQuery };
