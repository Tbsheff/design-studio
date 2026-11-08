import path from "node:path";

import { elementClassInfo, htmlVariantProps } from "./deps.js";
import type { GridInfo, GridItem, GridScope, SourceLoc } from "./deps.js";
import {
  NO_PLACEMENT,
  toChildLocs,
  toClassGrid,
  toClassPlacements,
  toCssGrid,
  toCssPlacements,
  toEmptyGrid,
} from "./engine/index.js";
import type { ChildLoc, GridPlacements, GridValues } from "./engine/index.js";
import { toInlineStyle } from "./inline-style.js";
import { getGridTarget } from "./site.js";
import type { GridTargetSite } from "./site.js";

interface GridGetRequest {
  readonly breakpoint: string;
  readonly limit: number;
  readonly source: SourceLoc;
}

const toCssDecls = (
  target: GridTargetSite,
  loc: { readonly col: number; readonly line: number }
): ReturnType<typeof toInlineStyle> => {
  if (target.prefix === "") {
    return toInlineStyle(target.site.code, loc.line, loc.col);
  }

  return htmlVariantProps(target.site.code, loc, target.prefix);
};

const toCssValues = (target: GridTargetSite, loc: SourceLoc): GridValues => {
  const values = toCssGrid(toCssDecls(target, loc));

  if (target.prefix === "" || values.display.source !== "unset") {
    return values;
  }

  const base = toCssGrid(toInlineStyle(target.site.code, loc.line, loc.col));

  return { ...values, display: base.display };
};

const toGridValues = (target: GridTargetSite, loc: SourceLoc): GridValues => {
  if (target.mode === "classes") {
    return toClassGrid(target.classes, target.prefix, target.site.theme);
  }

  if (target.mode === "css") {
    return toCssValues(target, loc);
  }

  return toEmptyGrid();
};

const toOwnPlacement = (
  target: GridTargetSite,
  loc: SourceLoc
): GridPlacements => {
  if (target.mode === "classes") {
    return toClassPlacements(target.classes, target.prefix);
  }

  if (target.mode === "css") {
    return toCssPlacements(toCssDecls(target, loc));
  }

  return { column: NO_PLACEMENT, row: NO_PLACEMENT };
};

const toItemPlacement = async (
  scope: GridScope,
  target: GridTargetSite,
  source: SourceLoc,
  child: ChildLoc
): Promise<Pick<GridItem, "column" | "row">> => {
  const loc = { col: child.col, file: source.file, line: child.line };

  if (target.mode === "classes") {
    const info = await elementClassInfo(
      scope.workTree,
      scope.project.kind,
      loc
    );

    return toClassPlacements(info.tailwind?.classes ?? [], target.prefix);
  }

  return toCssPlacements(toCssDecls(target, loc));
};

const inspectGridItems = (
  scope: GridScope,
  target: GridTargetSite,
  request: GridGetRequest
): Promise<GridItem[]> => {
  if (target.mode === "none") {
    return Promise.resolve([]);
  }

  const extension = path.extname(target.site.relative).toLowerCase();

  const children = toChildLocs(
    target.site.code,
    extension,
    request.source
  ).slice(0, request.limit);

  return Promise.all(
    children.map(async (child, index): Promise<GridItem> => {
      const { column, row } = await toItemPlacement(
        scope,
        target,
        request.source,
        child
      );

      return {
        column,
        index,
        row,
        source: {
          col: child.col,
          file: request.source.file,
          line: child.line,
        },
        tag: child.tag,
      };
    })
  );
};

const inspectGrid = async (
  scope: GridScope,
  request: GridGetRequest
): Promise<GridInfo> => {
  const target = await getGridTarget(scope, request.source, request.breakpoint);

  const values = toGridValues(target, request.source);

  return {
    ...values,
    breakpoint: request.breakpoint,
    file: target.site.relative,
    items: await inspectGridItems(scope, target, request),
    mode: target.mode,
    placement: toOwnPlacement(target, request.source),
    prefix: target.prefix,
    reason: target.reason,
  };
};

export { inspectGrid, toCssDecls, toGridValues };

export type { GridGetRequest };
