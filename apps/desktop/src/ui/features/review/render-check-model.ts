import type {
  LayoutFinding,
  RenderCheckResult,
} from "@design-studio/contracts";

import {
  consoleKey,
  keyCounts,
  layoutKey,
  takeKey,
} from "../../../shared/final-check-baseline.js";
import { copy } from "./copy.js";

interface ShownResult {
  readonly result: RenderCheckResult;
  readonly problems: string[];
  readonly layout: LayoutFinding[];
  readonly isOverflow: boolean;
}

interface HiddenSplit {
  readonly shown: ShownResult[];
  readonly hidden: number;
}

const SHOT_SUFFIX = /-(?:desktop|tablet|mobile)\.png$/u;

const toDirectionId = (
  results: readonly RenderCheckResult[] | null
): string | null => {
  const shot = results?.find((entry) => entry.screenshotPath)?.screenshotPath;
  const name = shot?.split(/[\\/]/u).pop() ?? "";

  if (SHOT_SUFFIX.test(name)) {
    return name.replace(SHOT_SUFFIX, "");
  }

  return null;
};

const toViewportLabel = (viewport: RenderCheckResult["viewport"]): string => {
  if (viewport === "desktop") {
    return copy.desktop;
  }

  if (viewport === "tablet") {
    return copy.tablet;
  }

  return copy.mobile;
};

const hideOldFindings = (
  results: readonly RenderCheckResult[] | null,
  keys: readonly string[] | null
): HiddenSplit => {
  const counts = keyCounts([...(keys ?? [])]);
  let hidden = 0;

  const keep = (key: string): boolean => {
    const isOld = takeKey(counts, `error|${key}`);

    if (isOld) {
      hidden += 1;
    }

    return !isOld;
  };

  const shown = (results ?? []).map((result) => ({
    isOverflow:
      result.horizontalOverflow && keep(`${result.viewport}|overflow`),
    layout: (result.layout ?? []).filter(
      (finding) =>
        finding.severity !== "error" ||
        keep(layoutKey(result.viewport, finding))
    ),
    problems: [...result.pageErrors, ...result.consoleErrors].filter((item) =>
      keep(consoleKey(result.viewport, item))
    ),
    result,
  }));

  return { hidden, shown };
};

const toLayoutTotal = (shown: ShownResult): number =>
  Math.max(
    shown.layout.length,
    (shown.result.layoutTotal ?? 0) -
      ((shown.result.layout ?? []).length - shown.layout.length)
  );

export { hideOldFindings, toDirectionId, toLayoutTotal, toViewportLabel };

export type { ShownResult };
