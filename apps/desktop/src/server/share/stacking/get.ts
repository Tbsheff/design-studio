import { htmlVariantProps } from "./deps.js";
import type {
  SourceLoc,
  StackingInfo,
  StackingScope,
  StackingValues,
} from "./deps.js";
import {
  classStackingOf,
  cssStackingOf,
  emptyStacking,
} from "./engine/stacking-read.js";
import { inlineStyleOf } from "./inline-style.js";
import { loadStackingTarget } from "./site.js";
import type { StackingTargetSite } from "./site.js";

interface StackingGetRequest {
  readonly breakpoint: string;
  readonly source: SourceLoc;
}

const toCssValuesOf = (
  target: StackingTargetSite,
  loc: SourceLoc
): StackingValues => {
  if (target.prefix === "") {
    return cssStackingOf(inlineStyleOf(target.site.code, loc.line, loc.col));
  }

  return cssStackingOf(
    htmlVariantProps(
      target.site.code,
      { col: loc.col, line: loc.line },
      target.prefix
    )
  );
};

const toValuesOf = (
  target: StackingTargetSite,
  loc: SourceLoc
): StackingValues => {
  if (target.mode === "classes") {
    return classStackingOf(target.classes, target.prefix, target.site.theme);
  }

  if (target.mode === "css") {
    return toCssValuesOf(target, loc);
  }

  return emptyStacking();
};

const inspectStacking = async (
  scope: StackingScope,
  request: StackingGetRequest
): Promise<StackingInfo> => {
  const target = await loadStackingTarget(
    scope,
    request.source,
    request.breakpoint
  );

  return {
    ...toValuesOf(target, request.source),
    breakpoint: request.breakpoint,
    file: target.site.relative,
    mode: target.mode,
    prefix: target.prefix,
    reason: target.reason,
  };
};

export { inspectStacking };

export type { StackingGetRequest };
