import {
  elementClassInfo,
  htmlVariantProps,
  loadStyleSite,
  stateClassOverridesOf,
  stateCssOverridesOf,
  STYLE_STATES,
} from "./deps.js";
import type {
  GroupAncestor,
  SourceLoc,
  StateLayer,
  StateListResult,
  StyleScope,
  StyleSite,
} from "./deps.js";
import { toEdgeKind } from "./edge-siblings.js";
import { forcedList } from "./forced-store.js";
import { toGroupAncestor } from "./group-ancestor.js";
import { toOwnGroupPart } from "./group-state.js";

const cssLayer = (site: StyleSite, loc: SourceLoc): StateLayer => ({
  file: site.relative,
  mode: "css",
  overrides: stateCssOverridesOf(site.set.list, (prefix) =>
    htmlVariantProps(site.code, { col: loc.col, line: loc.line }, prefix)
  ),
  reason: null,
});

const layerOf = async (
  scope: StyleScope,
  site: StyleSite,
  loc: SourceLoc
): Promise<StateLayer> => {
  const info = await elementClassInfo(scope.workTree, scope.project.kind, loc);

  if (site.theme !== null && info.tailwind?.mode === "classes") {
    return {
      file: site.relative,
      mode: "classes",
      overrides: stateClassOverridesOf(info.tailwind.classes, site.theme),
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

const toListedGroup = (
  site: StyleSite,
  source: SourceLoc,
  layer: StateLayer
): GroupAncestor | null => {
  if (layer.mode !== "classes") {
    return null;
  }

  const ancestor = toGroupAncestor(site, source);

  if (ancestor !== null) {
    return ancestor;
  }

  const own = toOwnGroupPart(layer.overrides.flatMap((entry) => entry.set));

  if (own === null) {
    return null;
  }

  return { hasDataState: own.state !== "group-hover", name: own.name };
};

const getStateStyleInfo = async (
  scope: StyleScope,
  source: SourceLoc
): Promise<StateListResult> => {
  const site = await loadStyleSite(scope, source);
  const found = await layerOf(scope, site, source);

  return {
    edge: toEdgeKind(site, source, found),
    forced: forcedList(scope.project.id),
    group: toListedGroup(site, source, found),
    layer: found,
    states: STYLE_STATES,
  };
};

export { getStateStyleInfo };
