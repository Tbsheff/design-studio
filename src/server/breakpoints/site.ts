import { readFile } from "node:fs/promises";

import type { BreakpointScope } from "./commit.js";
import {
  breakpointsOf,
  projectTailwindTheme,
  resolveSource,
  themeForFile,
} from "./deps.js";
import type { BreakpointSet, SourceLoc, TailwindTheme } from "./deps.js";

interface BreakpointSite {
  readonly code: string;
  readonly file: string;
  readonly html: boolean;
  readonly relative: string;
  readonly set: BreakpointSet;
  readonly theme: TailwindTheme | null;
}

const HTML_FILE = /\.html?$/iu;

const breakpointsOfTheme = (theme: TailwindTheme | null): BreakpointSet => {
  if (theme === null) {
    return breakpointsOf(null);
  }

  return breakpointsOf(theme.breakpoints);
};

const loadBreakpointSite = async (
  scope: BreakpointScope,
  loc: SourceLoc
): Promise<BreakpointSite> => {
  const resolved = await resolveSource(scope.workTree, loc.file);
  const text = await readFile(resolved.file, "utf-8");

  const fileTheme = await themeForFile(
    scope.workTree,
    resolved.relative,
    text,
    { projectKind: scope.project.kind }
  );

  return {
    code: text,
    file: resolved.file,
    html: HTML_FILE.test(resolved.relative),
    relative: resolved.relative,
    set: breakpointsOfTheme(fileTheme),
    theme: fileTheme,
  };
};

const loadProjectBreakpoints = async (
  scope: BreakpointScope
): Promise<BreakpointSet> => {
  if (scope.project.kind === "html") {
    return breakpointsOf(null);
  }

  const theme = await projectTailwindTheme(scope.workTree);

  return breakpointsOfTheme(theme);
};

export { loadBreakpointSite, loadProjectBreakpoints };

export type { BreakpointSite };
