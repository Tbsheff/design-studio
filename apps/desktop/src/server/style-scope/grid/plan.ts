import { commitGridEdit, guardGridEdit, planDirectEdit } from "./deps.js";
import type {
  DirectEditDeps,
  DirectEditRequest,
  GridMode,
  GridScope,
  GridSetResult,
  SourceLoc,
  Version,
  WrittenFile,
} from "./deps.js";
import type { ClassChanges, CssStyle } from "./engine/index.js";
import { GridError } from "./errors.js";
import { getGridTarget } from "./site.js";
import type { GridTargetSite } from "./site.js";

interface GridTarget {
  readonly selector: string | null;
  readonly source: SourceLoc;
  readonly tag: string | null;
}

interface GridParts {
  readonly classes: ClassChanges | null;
  readonly style: CssStyle;
  readonly title: string;
}

interface GridPlan {
  readonly breakpoint: string;
  readonly classes: ClassChanges | null;
  readonly mode: GridMode;
  readonly prefix: string;
  readonly style: CssStyle;
  readonly title: string;
  readonly written: WrittenFile[];
}

interface GridDone {
  readonly plan: GridPlan;
  readonly version: Version;
}

interface GridEditRequest {
  readonly breakpoint: string;
  readonly target: GridTarget;
  readonly toParts: (target: GridTargetSite) => GridParts;
}

const SAME = "The layer already has these grid values.";

const toTitle = (breakpoint: string, summary: string): string => {
  if (breakpoint === "base") {
    return `Grid: ${summary}`;
  }

  return `Grid at ${breakpoint}: ${summary}`;
};

const toEditRequest = (
  target: GridTarget,
  parts: GridParts,
  prefix: string
): DirectEditRequest => {
  const request: DirectEditRequest = {
    selector: target.selector ?? "",
    source: target.source,
  };

  if (parts.classes === null) {
    request.style = parts.style as DirectEditRequest["style"];
  } else {
    request.classes = { add: parts.classes.add, remove: parts.classes.remove };
  }

  if (target.tag !== null) {
    request.tag = target.tag;
  }

  if (prefix !== "") {
    request.variant = prefix;
  }

  return request;
};

const toPartsOf = (
  site: GridTargetSite,
  request: GridEditRequest
): GridParts => {
  if (site.mode === "none") {
    throw new GridError(site.reason ?? "This layer takes no grid edit.");
  }

  const parts = request.toParts(site);

  const isEmpty =
    parts.classes !== null &&
    parts.classes.add.length === 0 &&
    parts.classes.remove.length === 0;

  if (isEmpty) {
    throw new GridError(SAME);
  }

  return parts;
};

const toGridPlan = async (
  scope: GridScope,
  request: GridEditRequest
): Promise<GridPlan> => {
  const site = await getGridTarget(
    scope,
    request.target.source,
    request.breakpoint
  );

  const parts = toPartsOf(site, request);

  const planned = await planDirectEdit(
    scope.workTree,
    toEditRequest(request.target, parts, site.prefix),
    null,
    { projectKind: scope.project.kind }
  );

  if (planned.patch.code === planned.original) {
    throw new GridError(SAME);
  }

  return {
    breakpoint: request.breakpoint,
    classes: parts.classes,
    mode: site.mode,
    prefix: site.prefix,
    style: parts.style,
    title: toTitle(request.breakpoint, parts.title),
    written: [
      {
        code: planned.patch.code,
        original: planned.original,
        target: planned.target,
      },
    ],
  };
};

const applyGridEdit = async (
  deps: DirectEditDeps,
  scope: GridScope,
  request: GridEditRequest
): Promise<GridDone> => {
  guardGridEdit(deps, scope);

  const plan = await toGridPlan(scope, request);
  const version = await commitGridEdit(deps, scope, plan.written, plan.title);

  return { plan, version };
};

const toGridResult = (
  plan: GridPlan,
  version: Version | null
): GridSetResult => ({
  breakpoint: plan.breakpoint,
  classes: plan.classes,
  files: plan.written.map((entry) => entry.target.relative),
  mode: plan.mode,
  prefix: plan.prefix,
  style: plan.style,
  title: plan.title,
  versionId: version?.id ?? null,
});

export { applyGridEdit, toGridResult };

export type { GridDone, GridEditRequest, GridParts, GridPlan, GridTarget };
