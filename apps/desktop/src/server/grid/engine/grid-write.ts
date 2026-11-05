import type { GridPlacement } from "./deps.js";
import {
  HEAD,
  isPlacementClass,
  toClassPlacements,
  toCssPlacements,
} from "./grid-place.js";
import type { PlaceAxis } from "./grid-place.js";
import { toScopedClasses } from "./grid-scope.js";
import type { CssDeclaration } from "./grid-scope.js";
import { isTrackClass, toTrackClass } from "./grid-tracks.js";
import type { TrackAxis } from "./grid-tracks.js";

interface ClassChanges {
  readonly add: string[];
  readonly remove: string[];
}

interface TrackChange {
  readonly columns?: string | null;
  readonly display?: string;
  readonly rows?: string | null;
}

interface PlaceChange {
  readonly colSpan?: number | null;
  readonly colStart?: number | null;
  readonly rowSpan?: number | null;
  readonly rowStart?: number | null;
}

interface AxisDraft {
  span?: number | null;
  start?: number | null;
}

interface AxisChange {
  readonly span?: number | null;
  readonly start?: number | null;
}

type GridStyleProp =
  | "display"
  | "grid-column"
  | "grid-row"
  | "grid-template-columns"
  | "grid-template-rows";

type CssStyle = Partial<Record<GridStyleProp, string | null>>;

const DISPLAY_UTILITIES = new Set([
  "block",
  "contents",
  "flex",
  "flow-root",
  "grid",
  "inline",
  "inline-block",
  "inline-flex",
  "inline-grid",
]);

const SCALE_SPAN: Readonly<Record<PlaceAxis, number>> = { column: 12, row: 6 };

const SCALE_START: Readonly<Record<PlaceAxis, number>> = { column: 13, row: 7 };

const toSpanToken = (axis: PlaceAxis, span: number): string => {
  if (span <= SCALE_SPAN[axis]) {
    return `${HEAD[axis]}-span-${span}`;
  }

  return `${HEAD[axis]}-[span_${span}/span_${span}]`;
};

const toStartToken = (axis: PlaceAxis, start: number): string => {
  if (start <= SCALE_START[axis]) {
    return `${HEAD[axis]}-start-${start}`;
  }

  return `${HEAD[axis]}-start-[${start}]`;
};

const toNetChanges = (
  classes: readonly string[],
  remove: string[],
  add: string[]
): ClassChanges => {
  const added = new Set(add);
  const present = new Set(classes);

  return {
    add: [...added].filter((raw) => !present.has(raw)),
    remove: [...new Set(remove)].filter((raw) => !added.has(raw)),
  };
};

const toTrackChanges = (
  classes: readonly string[],
  prefix: string,
  axis: TrackAxis,
  text: string | null
): ClassChanges => {
  const remove = toScopedClasses(classes, prefix).flatMap((entry) => {
    if (isTrackClass(axis, entry.utility)) {
      return [entry.raw];
    }

    return [];
  });

  if (text === null) {
    return { add: [], remove };
  }

  return { add: [`${prefix}${toTrackClass(axis, text)}`], remove };
};

const toDisplayChanges = (
  classes: readonly string[],
  prefix: string,
  display: string
): ClassChanges => ({
  add: [`${prefix}${display}`],
  remove: toScopedClasses(classes, prefix).flatMap((entry) => {
    if (DISPLAY_UTILITIES.has(entry.utility)) {
      return [entry.raw];
    }

    return [];
  }),
});

const toGridClassChanges = (
  classes: readonly string[],
  prefix: string,
  change: TrackChange
): ClassChanges => {
  const parts: ClassChanges[] = [];

  if (change.display) {
    parts.push(toDisplayChanges(classes, prefix, change.display));
  }

  if ("columns" in change) {
    parts.push(
      toTrackChanges(classes, prefix, "columns", change.columns ?? null)
    );
  }

  if ("rows" in change) {
    parts.push(toTrackChanges(classes, prefix, "rows", change.rows ?? null));
  }

  return toNetChanges(
    classes,
    parts.flatMap((part) => part.remove),
    parts.flatMap((part) => part.add)
  );
};

const toGridCssStyle = (change: TrackChange): CssStyle => {
  const style: CssStyle = {};

  if (change.display) {
    style.display = change.display;
  }

  if ("columns" in change) {
    style["grid-template-columns"] = change.columns ?? null;
  }

  if ("rows" in change) {
    style["grid-template-rows"] = change.rows ?? null;
  }

  return style;
};

const toFinalLine = (
  current: number | null,
  change: AxisChange,
  key: keyof AxisChange
): number | null => {
  if (key in change) {
    return change[key] ?? null;
  }

  return current;
};

interface AxisRequest {
  readonly axis: PlaceAxis;
  readonly change: AxisChange;
  readonly current: GridPlacement;
}

const toAxisChanges = (
  classes: readonly string[],
  prefix: string,
  request: AxisRequest
): ClassChanges => {
  const { axis, change, current } = request;

  if (!("span" in change) && !("start" in change)) {
    return { add: [], remove: [] };
  }

  const keepsFull = current.isFull && !("span" in change);

  const remove = toScopedClasses(classes, prefix).flatMap((entry) => {
    const isKept = keepsFull && entry.utility.endsWith("-full");

    if (isPlacementClass(axis, entry.utility) && !isKept) {
      return [entry.raw];
    }

    return [];
  });

  const span = toFinalLine(current.span, change, "span");
  const start = toFinalLine(current.start, change, "start");
  const add: string[] = [];

  if (span !== null && !keepsFull) {
    add.push(`${prefix}${toSpanToken(axis, span)}`);
  }

  if (start !== null) {
    add.push(`${prefix}${toStartToken(axis, start)}`);
  }

  return { add, remove };
};

const toColumnChange = (change: PlaceChange): AxisChange => {
  const out: AxisDraft = {};

  if ("colSpan" in change) {
    out.span = change.colSpan ?? null;
  }

  if ("colStart" in change) {
    out.start = change.colStart ?? null;
  }

  return out;
};

const toRowChange = (change: PlaceChange): AxisChange => {
  const out: AxisDraft = {};

  if ("rowSpan" in change) {
    out.span = change.rowSpan ?? null;
  }

  if ("rowStart" in change) {
    out.start = change.rowStart ?? null;
  }

  return out;
};

const toItemClassChanges = (
  classes: readonly string[],
  prefix: string,
  change: PlaceChange
): ClassChanges => {
  const current = toClassPlacements(classes, prefix);

  const column = toAxisChanges(classes, prefix, {
    axis: "column",
    change: toColumnChange(change),
    current: current.column,
  });

  const row = toAxisChanges(classes, prefix, {
    axis: "row",
    change: toRowChange(change),
    current: current.row,
  });

  return toNetChanges(
    classes,
    [...column.remove, ...row.remove],
    [...column.add, ...row.add]
  );
};

const toPlacementText = (
  span: number | null,
  start: number | null
): string | null => {
  if (span !== null && start !== null) {
    return `${start} / span ${span}`;
  }

  if (span !== null) {
    return `span ${span}`;
  }

  if (start !== null) {
    return String(start);
  }

  return null;
};

const toAxisText = (
  current: GridPlacement,
  change: AxisChange
): string | null =>
  toPlacementText(
    toFinalLine(current.span, change, "span"),
    toFinalLine(current.start, change, "start")
  );

const toItemCssStyle = (
  decls: readonly CssDeclaration[],
  change: PlaceChange
): CssStyle => {
  const current = toCssPlacements(decls);
  const column = toColumnChange(change);
  const row = toRowChange(change);
  const style: CssStyle = {};

  if ("span" in column || "start" in column) {
    style["grid-column"] = toAxisText(current.column, column);
  }

  if ("span" in row || "start" in row) {
    style["grid-row"] = toAxisText(current.row, row);
  }

  return style;
};

export {
  toGridClassChanges,
  toGridCssStyle,
  toItemClassChanges,
  toItemCssStyle,
};

export type { ClassChanges, CssStyle, PlaceChange, TrackChange };
