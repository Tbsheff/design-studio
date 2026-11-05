import type { GridInput, GridItemInput, SourceLoc } from "./deps.js";
import {
  toGridClassChanges,
  toGridCssStyle,
  toItemClassChanges,
  toItemCssStyle,
} from "./engine/index.js";
import { GridError } from "./errors.js";
import { toCssDecls, toGridValues } from "./get.js";
import type { GridParts } from "./plan.js";
import type { GridTargetSite } from "./site.js";

const NO_GRID_CHANGE = "Pass at least one of columns, rows or display.";

const NO_ITEM_CHANGE =
  "Pass at least one of colStart, colSpan, rowStart or rowSpan.";

const toLineSummary = (
  label: string,
  value: number | string | null
): string => {
  if (value === null) {
    return `reset ${label}`;
  }

  return `${label} ${value}`;
};

const toGridSummary = (input: GridInput): string => {
  const parts: string[] = [];

  if (input.display) {
    parts.push(`display ${input.display}`);
  }

  if ("columns" in input) {
    parts.push(toLineSummary("columns", input.columns ?? null));
  }

  if ("rows" in input) {
    parts.push(toLineSummary("rows", input.rows ?? null));
  }

  return parts.join(", ");
};

const toGridLayerReason = (
  target: GridTargetSite,
  input: GridInput,
  loc: SourceLoc
): string | null => {
  const isSettingTracks =
    (input.columns ?? null) !== null || (input.rows ?? null) !== null;

  if (!isSettingTracks || input.display) {
    return null;
  }

  const { display } = toGridValues(target, loc);

  if (display.source === "unset" || display.isGrid) {
    return null;
  }

  return `This layer is display ${display.value ?? "unknown"}, not grid. Pass display grid to make it a grid.`;
};

const toGridParts = (
  target: GridTargetSite,
  input: GridInput,
  loc: SourceLoc
): GridParts => {
  if (!("columns" in input) && !("rows" in input) && !input.display) {
    throw new GridError(NO_GRID_CHANGE);
  }

  const reason = toGridLayerReason(target, input, loc);

  if (reason !== null) {
    throw new GridError(reason);
  }

  const title = toGridSummary(input);

  if (target.mode === "css") {
    return { classes: null, style: toGridCssStyle(input), title };
  }

  return {
    classes: toGridClassChanges(target.classes, target.prefix, input),
    style: {},
    title,
  };
};

const toItemSummary = (input: GridItemInput): string => {
  const parts: string[] = [];

  if ("colStart" in input) {
    parts.push(toLineSummary("column start", input.colStart ?? null));
  }

  if ("colSpan" in input) {
    parts.push(toLineSummary("column span", input.colSpan ?? null));
  }

  if ("rowStart" in input) {
    parts.push(toLineSummary("row start", input.rowStart ?? null));
  }

  if ("rowSpan" in input) {
    parts.push(toLineSummary("row span", input.rowSpan ?? null));
  }

  return `item ${parts.join(", ")}`;
};

const toItemParts = (
  target: GridTargetSite,
  input: GridItemInput,
  loc: SourceLoc
): GridParts => {
  const keys = ["colSpan", "colStart", "rowSpan", "rowStart"];

  if (!keys.some((key) => key in input)) {
    throw new GridError(NO_ITEM_CHANGE);
  }

  const title = toItemSummary(input);

  if (target.mode === "css") {
    return {
      classes: null,
      style: toItemCssStyle(toCssDecls(target, loc), input),
      title,
    };
  }

  return {
    classes: toItemClassChanges(target.classes, target.prefix, input),
    style: {},
    title,
  };
};

export { toGridParts, toItemParts };
