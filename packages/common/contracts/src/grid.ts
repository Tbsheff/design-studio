const GRID_DISPLAYS = ["grid", "inline-grid"] as const;

const GRID_TRACKS_MAX = 200;

const GRID_LINE_MAX = 100;

const GRID_TRACK_EXPAND_MAX = 64;

const GRID_TRACKS_PATTERN = /^[A-Za-z0-9\s.,()%+\-*/]+$/u;

type GridDisplay = (typeof GRID_DISPLAYS)[number];

type GridMode = "classes" | "css" | "none";

type GridSource = "class" | "css" | "unset";

interface GridDisplayValue {
  readonly className: string | null;
  readonly isGrid: boolean;
  readonly source: GridSource;
  readonly value: string | null;
}

interface GridTrackList {
  readonly className: string | null;
  readonly source: GridSource;
  readonly text: string | null;
  readonly tracks: readonly string[];
}

interface GridGapValue {
  readonly className: string | null;
  readonly source: GridSource;
  readonly value: string | null;
}

interface GridPlacement {
  readonly classes: readonly string[];
  readonly isFull: boolean;
  readonly span: number | null;
  readonly start: number | null;
}

interface GridItemSource {
  readonly col: number;
  readonly file: string;
  readonly line: number;
}

interface GridItem {
  readonly column: GridPlacement;
  readonly index: number;
  readonly row: GridPlacement;
  readonly source: GridItemSource;
  readonly tag: string;
}

interface GridPlacements {
  readonly column: GridPlacement;
  readonly row: GridPlacement;
}

interface GridInfo {
  readonly breakpoint: string;
  readonly columnGap: GridGapValue;
  readonly columns: GridTrackList;
  readonly display: GridDisplayValue;
  readonly file: string;
  readonly items: readonly GridItem[];
  readonly mode: GridMode;
  readonly placement: GridPlacements;
  readonly prefix: string;
  readonly reason: string | null;
  readonly rowGap: GridGapValue;
  readonly rows: GridTrackList;
}

interface GridInput {
  readonly breakpoint?: string;
  readonly columns?: string | null;
  readonly display?: GridDisplay;
  readonly rows?: string | null;
}

interface GridItemInput {
  readonly breakpoint?: string;
  readonly colSpan?: number | null;
  readonly colStart?: number | null;
  readonly rowSpan?: number | null;
  readonly rowStart?: number | null;
}

interface GridSetResult {
  readonly breakpoint: string;
  readonly classes: {
    readonly add: readonly string[];
    readonly remove: readonly string[];
  } | null;
  readonly files: readonly string[];
  readonly mode: GridMode;
  readonly prefix: string;
  readonly style: Readonly<Record<string, string | null>>;
  readonly title: string;
  readonly versionId: string | null;
}

export {
  GRID_DISPLAYS,
  GRID_LINE_MAX,
  GRID_TRACK_EXPAND_MAX,
  GRID_TRACKS_MAX,
  GRID_TRACKS_PATTERN,
};

export type {
  GridDisplay,
  GridDisplayValue,
  GridGapValue,
  GridInfo,
  GridInput,
  GridItem,
  GridItemInput,
  GridItemSource,
  GridMode,
  GridPlacement,
  GridPlacements,
  GridSetResult,
  GridSource,
  GridTrackList,
};
