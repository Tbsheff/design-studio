import {
  elementClassInfo,
  htmlVariantProps,
  loadStyleSite,
  stateClassOverridesOf,
  stateCssOverridesOf,
  STYLE_STATES,
} from "./deps.js";
import type {
  SourceLoc,
  StateLayer,
  StateListResult,
  StyleScope,
  StyleSite,
} from "./deps.js";
import { forcedList } from "./forced-store.js";

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

const listStateStyles = async (
  scope: StyleScope,
  source: SourceLoc
): Promise<StateListResult> => {
  const site = await loadStyleSite(scope, source);
  const found = await layerOf(scope, site, source);

  return {
    forced: forcedList(scope.project.id),
    layer: found,
    states: STYLE_STATES,
  };
};

export { listStateStyles };
