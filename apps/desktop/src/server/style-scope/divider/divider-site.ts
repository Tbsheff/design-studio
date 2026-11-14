import { readFile } from "node:fs/promises";

import { elementClassInfo, resolveSource, themeForFile } from "./deps.js";
import type { Direction, Project, SourceLoc } from "./deps.js";

interface DividerScope {
  readonly direction: Direction;
  readonly project: Project;
  readonly workTree: string;
}

type ResolvedTarget = Awaited<ReturnType<typeof resolveSource>>;

interface DividerSite {
  readonly classes: readonly string[];
  readonly code: string;
  readonly colorNames: ReadonlySet<string>;
  readonly isHtml: boolean;
  readonly mode: "classes" | "css";
  readonly target: ResolvedTarget;
}

const HTML_FILE = /\.html?$/iu;

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
    code: text,
    colorNames: theme?.colorNames ?? new Set<string>(),
    isHtml: HTML_FILE.test(resolved.relative),
    mode: toModeOf(isTailwind),
    target: resolved,
  };
};

export { toDividerSite };

export type { DividerScope, DividerSite };
