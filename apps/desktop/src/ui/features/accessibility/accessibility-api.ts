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

export { applyContrastFix, readAccessibility, writeAccessibility };

export type { AccessibilityIds, InspectQuery };
