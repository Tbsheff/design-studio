import { readFile } from "node:fs/promises";

import { elementClassInfo, resolveSource, themeForFile } from "./deps.js";
import type { Direction, Project, SourceLoc } from "./deps.js";

interface DividerScope {
  readonly direction: Direction;
  readonly project: Project;
  readonly workTree: string;
}

interface DividerSite {
  readonly classes: readonly string[];
  readonly colorNames: ReadonlySet<string>;
  readonly mode: "classes" | "css";
}

const toModeOf = (isTailwind: boolean): DividerSite["mode"] => {
  if (isTailwind) {
    return "classes";
  }

  return "css";
};

const toDividerSite = async (
  scope: DividerScope,
  loc: SourceLoc
): Promise<DividerSite> => {
  const resolved = await resolveSource(scope.workTree, loc.file);

  const [text, info] = await Promise.all([
    readFile(resolved.file, "utf-8"),
    elementClassInfo(scope.workTree, scope.project.kind, loc),
  ]);

  const theme = await themeForFile(scope.workTree, resolved.relative, text, {
    projectKind: scope.project.kind,
  });

  const isTailwind = info.tailwind?.mode === "classes" && theme !== null;

  return {
    classes: info.tailwind?.classes ?? [],
    colorNames: theme?.colorNames ?? new Set<string>(),
    mode: toModeOf(isTailwind),
  };
};

export { toDividerSite };

export type { DividerScope, DividerSite };
