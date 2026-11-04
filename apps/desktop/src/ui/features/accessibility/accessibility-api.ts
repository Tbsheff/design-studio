import { json, replaceStyle } from "./deps.js";
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

const pathOf = (ids: AccessibilityIds): string =>
  `/api/projects/${encodeURIComponent(ids.projectId)}/d/${encodeURIComponent(ids.directionId)}/accessibility`;

const readAccessibility = (
  ids: AccessibilityIds,
  query: InspectQuery
): Promise<AccessibilityReport> => {
  const params = new URLSearchParams({
    includePassing: String(query.passing),
  });

  if (query.frame !== null) {
    params.set("frame", query.frame);
  }

  if (query.selector !== null) {
    params.set("selector", query.selector);
  }

  return json<AccessibilityReport>(
    "GET",
    `${pathOf(ids)}?${params.toString()}`
  );
};

const writeAccessibility = (
  ids: AccessibilityIds,
  target: SelectionContext,
  changes: AccessibilityChanges
): Promise<AccessibilitySetResult> =>
  json<AccessibilitySetResult>("POST", pathOf(ids), {
    ...changes,
    target: {
      selector: target.selector,
      source: target.source,
      tag: target.tag,
      usedAt: target.usedAt ?? null,
    },
  });

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
