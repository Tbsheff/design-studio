import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Direction, Project } from "@design-studio/contracts";

import { changedLineRanges } from "../../shared/line-diff.js";
import type { PreviewService } from "../../shared/server-ports.js";
import type { PortKitFind } from "../components/kit-drift/index.js";
import { hasAppDarkValues, inspectAppDark } from "./app-review-dark.js";
import type { AppDarkCheck } from "./app-review-dark.js";
import { listScanFiles, toHighKitCount } from "./port-review-kit.js";
import type { RouteFileText } from "./port-route-update.js";
import type { ChangedFile } from "./screens.js";

interface RouteDarkScope {
  readonly before: RouteFileText | null;
  readonly direction: Direction;
  readonly files: readonly string[];
  readonly project: Project;
  readonly routePath: string;
  readonly url: string;
}

interface GapCheck {
  readonly dark: AppDarkCheck | null;
  readonly kit: readonly PortKitFind[] | null;
}

const FIRST_ITEM =
  /in (?<file>\S+) (?:is|are) under AA contrast in dark \(first: line (?<line>\d+)(?<ratio>, [\d.]+:1)?\)/u;

const isSameFile = (left: string, right: string): boolean =>
  left === right || left.endsWith(`/${right}`) || right.endsWith(`/${left}`);

const toChangedLines = async (
  workTree: string,
  before: RouteFileText | null,
  file: string
): Promise<ChangedFile["lines"]> => {
  if (before === null || !isSameFile(before.file, file)) {
    return null;
  }

  try {
    const now = await readFile(path.join(workTree, file), "utf-8");

    return changedLineRanges(before.text, now);
  } catch {
    return null;
  }
};

const listChangedFiles = async (
  scope: RouteDarkScope
): Promise<ChangedFile[]> => {
  const { workTree } = scope.direction;

  const files = await listScanFiles({
    files: scope.files,
    project: scope.project,
    routePath: scope.routePath,
    workTree,
  });

  return Promise.all(
    files.map(async (file) => ({
      file,
      lines: await toChangedLines(workTree, scope.before, file),
    }))
  );
};

const inspectRouteDark = async (
  scope: RouteDarkScope,
  preview: PreviewService
): Promise<AppDarkCheck | null> => {
  const ctx = { direction: scope.direction, project: scope.project };
  const changed = await listChangedFiles(scope);
  const check = await inspectAppDark(ctx, preview, scope.url, changed);

  if (check.count === null && !(await hasAppDarkValues(ctx))) {
    return null;
  }

  return check;
};

const toDarkCount = (dark: AppDarkCheck | null): number => dark?.count ?? 0;

const hasDarkGap = (dark: AppDarkCheck | null): boolean =>
  toDarkCount(dark) > 0;

const toGapCount = (check: GapCheck): number =>
  toHighKitCount(check.kit) + toDarkCount(check.dark);

const toItemsText = (count: number): string => {
  if (count === 1) {
    return "1 item";
  }

  return `${count} items`;
};

const toFirstText = (lines: readonly string[]): string => {
  const groups = FIRST_ITEM.exec(lines[0] ?? "")?.groups ?? null;

  if (groups === null) {
    return "";
  }

  const ratio = groups["ratio"] ?? "";

  return ` (${groups["file"] ?? ""} line ${groups["line"] ?? ""}${ratio})`;
};

const toDarkText = (dark: AppDarkCheck | null): string => {
  if (dark === null) {
    return "Dark: not checked (the app has no dark values)";
  }

  if (dark.count === null) {
    return "Dark: not checked (no dark render)";
  }

  return `Dark: ${toItemsText(dark.count)} under AA${toFirstText(dark.lines)}`;
};

export { hasDarkGap, inspectRouteDark, toDarkText, toGapCount };

export type { GapCheck, RouteDarkScope };
