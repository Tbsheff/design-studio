import type { GridPlacement } from "./deps.js";
import { toDeclared, toScopedClasses } from "./grid-scope.js";
import type { CssDeclaration, ScopedClass } from "./grid-scope.js";

type PlaceAxis = "column" | "row";

const HEAD: Readonly<Record<PlaceAxis, string>> = { column: "col", row: "row" };

const NO_PLACEMENT: GridPlacement = {
  classes: [],
  isFull: false,
  span: null,
  start: null,
};

const toInt = (text: string | null): number | null => {
  if (text === null || !/^\d+$/u.test(text)) {
    return null;
  }

  return Number(text);
};

const toSpanPattern = (axis: PlaceAxis): RegExp =>
  new RegExp(
    `^${HEAD[axis]}-(?:span-(?<plain>\\d+|full|\\[\\d+\\])|\\[span_(?<arb>\\d+)/span_\\d+\\])$`,
    "u"
  );

const toStartPattern = (axis: PlaceAxis): RegExp =>
  new RegExp(`^${HEAD[axis]}-start-(?<plain>\\d+|auto|\\[\\d+\\])$`, "u");

const toBracketed = (text: string): string =>
  text.replace(/^\[(?<digits>\d+)\]$/u, "$<digits>");

const isPlacementClass = (axis: PlaceAxis, utility: string): boolean =>
  toSpanPattern(axis).test(utility) || toStartPattern(axis).test(utility);

const toClassPlacement = (
  scoped: readonly ScopedClass[],
  axis: PlaceAxis
): GridPlacement => {
  const spanPattern = toSpanPattern(axis);
  const startPattern = toStartPattern(axis);
  let span: number | null = null;
  let start: number | null = null;
  let isFull = false;
  const classes: string[] = [];

  for (const entry of scoped) {
    const spanHit = spanPattern.exec(entry.utility);
    const startHit = startPattern.exec(entry.utility);

    if (spanHit !== null) {
      classes.push(entry.raw);
      isFull = spanHit.groups?.plain === "full";
      span = toInt(
        toBracketed(spanHit.groups?.plain ?? spanHit.groups?.arb ?? "")
      );
    }

    if (startHit !== null) {
      classes.push(entry.raw);
      start = toInt(toBracketed(startHit.groups?.plain ?? ""));
    }
  }

  return { classes, isFull, span, start };
};

const toLineNumber = (text: string): number | null => toInt(text.trim());

const toSpanNumber = (text: string): number | null => {
  const hit = /^span\s+(?<count>\d+)$/u.exec(text.trim());

  return toInt(hit?.groups?.count ?? null);
};

const toCssPlacement = (
  decls: readonly CssDeclaration[],
  axis: PlaceAxis
): GridPlacement => {
  const value = toDeclared(decls, `grid-${axis}`);

  if (value === null) {
    return NO_PLACEMENT;
  }

  const [first = "", second = null] = value
    .split("/")
    .map((part) => part.trim());

  const start = toLineNumber(first);
  const isFull = start === 1 && second === "-1";
  let span = toSpanNumber(first);

  if (second !== null) {
    span = toSpanNumber(second);
  }

  if (span === null && start !== null && second !== null) {
    const end = toLineNumber(second);

    if (end !== null && end > start) {
      span = end - start;
    }
  }

  return { classes: [], isFull, span, start };
};

interface GridPlacements {
  readonly column: GridPlacement;
  readonly row: GridPlacement;
}

const toClassPlacements = (
  classes: readonly string[],
  prefix: string
): GridPlacements => {
  const scoped = toScopedClasses(classes, prefix);

  return {
    column: toClassPlacement(scoped, "column"),
    row: toClassPlacement(scoped, "row"),
  };
};

const toCssPlacements = (decls: readonly CssDeclaration[]): GridPlacements => ({
  column: toCssPlacement(decls, "column"),
  row: toCssPlacement(decls, "row"),
});

export {
  HEAD,
  isPlacementClass,
  NO_PLACEMENT,
  toClassPlacement,
  toClassPlacements,
  toCssPlacement,
  toCssPlacements,
};

export type { GridPlacements, PlaceAxis };
