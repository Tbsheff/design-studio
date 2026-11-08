import { elementClassInfo, loadStackingSite, prefixOf } from "./deps.js";
import type {
  SourceLoc,
  StackingMode,
  StackingScope,
  StackingSite,
} from "./deps.js";
import { StackingError } from "./errors.js";

interface StackingTargetSite {
  readonly classes: readonly string[];
  readonly mode: StackingMode;
  readonly prefix: string;
  readonly reason: string | null;
  readonly site: StackingSite;
}

const toPrefixFor = (site: StackingSite, breakpoint: string): string => {
  const result = prefixOf(site.set.list, breakpoint);

  if (!result.ok) {
    throw new StackingError(result.code);
  }

  return result.value;
};

const toModeFor = (
  site: StackingSite,
  tailwind: boolean,
  prefix: string
): StackingMode => {
  if (site.theme !== null && tailwind) {
    return "classes";
  }

  if (site.html || prefix === "") {
    return "css";
  }

  return "none";
};

const toLoadStackingTarget = async (
  scope: StackingScope,
  loc: SourceLoc,
  breakpoint: string
): Promise<StackingTargetSite> => {
  const site = await loadStackingSite(scope, loc);
  const prefix = toPrefixFor(site, breakpoint);
  const info = await elementClassInfo(scope.workTree, scope.project.kind, loc);
  const tailwind = info.tailwind?.mode === "classes";
  const mode = toModeFor(site, tailwind, prefix);
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

export { toLoadStackingTarget as loadStackingTarget };

export type { StackingTargetSite };
