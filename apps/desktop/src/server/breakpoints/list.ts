import type { BreakpointScope } from "./commit.js";
import {
  activeOf,
  classOverridesOf,
  cssOverridesOf,
  elementClassInfo,
  htmlVariantProps,
} from "./deps.js";
import type {
  BreakpointActive,
  BreakpointLayer,
  BreakpointListResult,
  CanvasFileFrame,
  SourceLoc,
} from "./deps.js";
import { BreakpointError } from "./errors.js";
import { loadBreakpointSite, loadProjectBreakpoints } from "./site.js";
import type { BreakpointSite } from "./site.js";

interface BreakpointListRequest {
  readonly frame: string | null;
  readonly frames: readonly CanvasFileFrame[];
  readonly source: SourceLoc | null;
  readonly width: number | null;
}

interface FrameWidth {
  readonly frame: string | null;
  readonly width: number;
}

const frameWidthOf = (request: BreakpointListRequest): FrameWidth | null => {
  if (request.frame === null) {
    if (request.width === null) {
      return null;
    }

    return { frame: null, width: request.width };
  }

  const hit = request.frames.find(
    (entry) => entry.id === request.frame || entry.label === request.frame
  );

  if (!hit) {
    throw new BreakpointError(
      `No canvas frame has the id or label ${request.frame}.`
    );
  }

  return { frame: hit.id, width: hit.width };
};

const cssLayer = (site: BreakpointSite, loc: SourceLoc): BreakpointLayer => ({
  file: site.relative,
  mode: "css",
  overrides: cssOverridesOf(site.set.list, (prefix) =>
    htmlVariantProps(site.code, { col: loc.col, line: loc.line }, prefix)
  ),
  reason: null,
});

const layerOf = async (
  scope: BreakpointScope,
  site: BreakpointSite,
  loc: SourceLoc
): Promise<BreakpointLayer> => {
  const info = await elementClassInfo(scope.workTree, scope.project.kind, loc);
  const classes = info.tailwind?.classes ?? [];

  if (site.theme !== null && info.tailwind?.mode === "classes") {
    return {
      file: site.relative,
      mode: "classes",
      overrides: classOverridesOf(classes, site.theme, site.set.list),
      reason: null,
    };
  }

  if (site.html) {
    return cssLayer(site, loc);
  }

  return {
    file: site.relative,
    mode: "none",
    overrides: [],
    reason: info.variants.reason,
  };
};

const activeFor = (
  list: BreakpointListResult["breakpoints"],
  request: BreakpointListRequest
): BreakpointActive | null => {
  const frame = frameWidthOf(request);

  if (frame === null) {
    return null;
  }

  return activeOf(list, frame.width, frame.frame);
};

const listBreakpoints = async (
  scope: BreakpointScope,
  request: BreakpointListRequest
): Promise<BreakpointListResult> => {
  if (request.source === null) {
    const set = await loadProjectBreakpoints(scope);

    return {
      active: activeFor(set.list, request),
      breakpoints: set.list,
      layer: null,
      source: set.source,
    };
  }

  const site = await loadBreakpointSite(scope, request.source);
  const found = await layerOf(scope, site, request.source);

  return {
    active: activeFor(site.set.list, request),
    breakpoints: site.set.list,
    layer: found,
    source: site.set.source,
  };
};

export { listBreakpoints };

export type { BreakpointListRequest };
