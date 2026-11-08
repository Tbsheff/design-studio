import { elementClassInfo, loadGridSite, prefixOf } from "./deps.js";
import type { GridMode, GridScope, GridSite, SourceLoc } from "./deps.js";
import { GridError } from "./errors.js";

interface GridTargetSite {
  readonly classes: readonly string[];
  readonly mode: GridMode;
  readonly prefix: string;
  readonly reason: string | null;
  readonly site: GridSite;
}

const toPrefix = (site: GridSite, breakpoint: string): string => {
  const result = prefixOf(site.set.list, breakpoint);

  if (!result.ok) {
    throw new GridError(result.code);
  }

  return result.value;
};

const toMode = (
  site: GridSite,
  isTailwind: boolean,
  prefix: string
): GridMode => {
  if (site.theme !== null && isTailwind) {
    return "classes";
  }

  if (site.html || prefix === "") {
    return "css";
  }

  return "none";
};

const getGridTarget = async (
  scope: GridScope,
  loc: SourceLoc,
  breakpoint: string
): Promise<GridTargetSite> => {
  const site = await loadGridSite(scope, loc);
  const prefix = toPrefix(site, breakpoint);
  const info = await elementClassInfo(scope.workTree, scope.project.kind, loc);
  const mode = toMode(site, info.tailwind?.mode === "classes", prefix);
  let reason: string | null = null;

  if (mode === "none") {
    reason =
      info.variants.reason ??
      "This file has no Tailwind classes and no stylesheet for a breakpoint.";
  }

  return {
    classes: info.tailwind?.classes ?? [],
    mode,
    prefix,
    reason,
    site,
  };
};

export { getGridTarget };

export type { GridTargetSite };
