import type {
  GridDisplayValue,
  GridGapValue,
  GridTrackList,
  TailwindTheme,
} from "./deps.js";
import { toDeclared, toLastClass, toScopedClasses } from "./grid-scope.js";
import type { CssDeclaration, ScopedClass } from "./grid-scope.js";
import { toTrackList, toTrackText } from "./grid-tracks.js";
import type { TrackAxis } from "./grid-tracks.js";

interface GridValues {
  readonly columnGap: GridGapValue;
  readonly columns: GridTrackList;
  readonly display: GridDisplayValue;
  readonly rowGap: GridGapValue;
  readonly rows: GridTrackList;
}

const DISPLAY_UTILITIES = new Set([
  "block",
  "contents",
  "flex",
  "flow-root",
  "grid",
  "hidden",
  "inline",
  "inline-block",
  "inline-flex",
  "inline-grid",
]);

const GRID_WORDS = new Set(["grid", "inline-grid"]);

const UNSET = "unset";

const TRACK_HEAD: Readonly<Record<TrackAxis, string>> = {
  columns: "grid-cols-",
  rows: "grid-rows-",
};

const NO_DISPLAY: GridDisplayValue = {
  className: null,
  isGrid: false,
  source: UNSET,
  value: null,
};

const NO_TRACKS: GridTrackList = {
  className: null,
  source: UNSET,
  text: null,
  tracks: [],
};

const NO_GAP: GridGapValue = { className: null, source: UNSET, value: null };

const toDisplayValue = (
  name: string | null,
  word: string,
  origin: GridDisplayValue["source"]
): GridDisplayValue => ({
  className: name,
  isGrid: GRID_WORDS.has(word),
  source: origin,
  value: word,
});

const toDisplayCss = (utility: string): string => {
  if (utility === "hidden") {
    return "none";
  }

  return utility;
};

const toClassDisplay = (scoped: readonly ScopedClass[]): GridDisplayValue => {
  const hit = toLastClass(scoped, (utility) => DISPLAY_UTILITIES.has(utility));

  if (hit === null) {
    return NO_DISPLAY;
  }

  return toDisplayValue(hit.raw, toDisplayCss(hit.utility), "class");
};

const toClassTracks = (
  scoped: readonly ScopedClass[],
  axis: TrackAxis
): GridTrackList => {
  const head = TRACK_HEAD[axis];
  const hit = toLastClass(scoped, (utility) => utility.startsWith(head));

  if (hit === null) {
    return NO_TRACKS;
  }

  const text = toTrackText(axis, hit.utility);
  const tracks = toTrackList(text);

  return { className: hit.raw, source: "class", text, tracks };
};

const toGapText = (key: string, theme: TailwindTheme | null): string | null => {
  if (key.startsWith("[") && key.endsWith("]")) {
    return key.slice(1, -1).replaceAll("_", " ");
  }

  if (theme === null) {
    return null;
  }

  if (/^\d+(?:\.\d+)?$/u.test(key)) {
    return `${Number(key) * theme.spacingPx}px`;
  }

  if (!theme.spacing.has(key)) {
    return null;
  }

  return `${theme.spacing.get(key) ?? 0}px`;
};

const isSharedGap = (utility: string): boolean =>
  /^gap-(?!x-|y-)/u.test(utility);

const toClassGap = (
  scoped: readonly ScopedClass[],
  axisHead: string,
  theme: TailwindTheme | null
): GridGapValue => {
  const axis = toLastClass(scoped, (utility) => utility.startsWith(axisHead));
  const both = toLastClass(scoped, isSharedGap);

  if (axis !== null) {
    return {
      className: axis.raw,
      source: "class",
      value: toGapText(axis.utility.slice(axisHead.length), theme),
    };
  }

  if (both === null) {
    return NO_GAP;
  }

  return {
    className: both.raw,
    source: "class",
    value: toGapText(both.utility.slice("gap-".length), theme),
  };
};

const toClassGrid = (
  classes: readonly string[],
  prefix: string,
  theme: TailwindTheme | null
): GridValues => {
  const scoped = toScopedClasses(classes, prefix);
  const own = toClassDisplay(scoped);
  let shown = own;

  if (own.source === UNSET) {
    shown = toClassDisplay(toScopedClasses(classes, ""));
  }

  return {
    columnGap: toClassGap(scoped, "gap-x-", theme),
    columns: toClassTracks(scoped, "columns"),
    display: shown,
    rowGap: toClassGap(scoped, "gap-y-", theme),
    rows: toClassTracks(scoped, "rows"),
  };
};

const toCssTracks = (value: string | null): GridTrackList => {
  if (value === null) {
    return NO_TRACKS;
  }

  return {
    className: null,
    source: "css",
    text: value,
    tracks: toTrackList(value),
  };
};

const toCssGap = (
  decls: readonly CssDeclaration[],
  prop: string,
  index: number
): GridGapValue => {
  const own = toDeclared(decls, prop);
  const both = toDeclared(decls, "gap")?.split(/\s+/u)[index] ?? null;
  const value = own ?? both;

  if (value === null) {
    return NO_GAP;
  }

  return { className: null, source: "css", value };
};

const toCssDisplay = (decls: readonly CssDeclaration[]): GridDisplayValue => {
  const value = toDeclared(decls, "display");

  if (value === null) {
    return NO_DISPLAY;
  }

  return toDisplayValue(null, value.trim(), "css");
};

const toCssGrid = (decls: readonly CssDeclaration[]): GridValues => ({
  columnGap: toCssGap(decls, "column-gap", 1),
  columns: toCssTracks(toDeclared(decls, "grid-template-columns")),
  display: toCssDisplay(decls),
  rowGap: toCssGap(decls, "row-gap", 0),
  rows: toCssTracks(toDeclared(decls, "grid-template-rows")),
});

const toEmptyGrid = (): GridValues => toCssGrid([]);

export { toClassGrid, toCssGrid, toEmptyGrid };

export type { GridValues };
