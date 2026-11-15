const STACKING_POSITIONS = [
  "static",
  "relative",
  "sticky",
  "fixed",
  "absolute",
] as const;

const STACKING_OVERFLOWS = [
  "visible",
  "hidden",
  "auto",
  "scroll",
  "clip",
] as const;

const STACKING_SIDES = ["top", "right", "bottom", "left"] as const;

const STACKING_PROPERTIES = [
  "position",
  "top",
  "right",
  "bottom",
  "left",
  "overflow-x",
  "overflow-y",
  "z-index",
] as const;

const Z_SCALE = ["0", "10", "20", "30", "40", "50", "auto"] as const;

const STACKING_VALUE_MAX = 200;

const STACKING_OTHERS_MAX = 20;

type StackingPosition = (typeof STACKING_POSITIONS)[number];

type StackingOverflow = (typeof STACKING_OVERFLOWS)[number];

type StackingSide = (typeof STACKING_SIDES)[number];

type StackingProperty = (typeof STACKING_PROPERTIES)[number];

type StackingSource =
  | "arbitrary"
  | "class"
  | "css"
  | "scale"
  | "token"
  | "unset";

type StackingMode = "classes" | "css" | "none";

type StackingChanges = Readonly<
  Partial<Record<StackingProperty, string | null>>
>;

interface StackingValue {
  readonly className: string | null;
  readonly source: StackingSource;
  readonly token: string | null;
  readonly value: string | null;
}

interface StackingValues {
  readonly inset: Readonly<Record<StackingSide, StackingValue>>;
  readonly overflowX: StackingValue;
  readonly overflowY: StackingValue;
  readonly position: StackingValue;
  readonly zIndex: StackingValue;
}

interface StackingInfo extends StackingValues {
  readonly breakpoint: string;
  readonly file: string;
  readonly mode: StackingMode;
  readonly prefix: string;
  readonly reason: string | null;
}

interface StackingInput {
  readonly breakpoint: string;
  readonly changes: StackingChanges;
}

interface StackingSetResult {
  readonly breakpoint: string;
  readonly classes: {
    readonly add: readonly string[];
    readonly remove: readonly string[];
  } | null;
  readonly files: readonly string[];
  readonly mode: StackingMode;
  readonly prefix: string;
  readonly style: Readonly<Record<string, string | null>>;
  readonly title: string;
  readonly versionId: string | null;
}

export {
  STACKING_OTHERS_MAX,
  STACKING_OVERFLOWS,
  STACKING_POSITIONS,
  STACKING_PROPERTIES,
  STACKING_SIDES,
  STACKING_VALUE_MAX,
  Z_SCALE,
};

export type {
  StackingChanges,
  StackingInfo,
  StackingInput,
  StackingMode,
  StackingOverflow,
  StackingPosition,
  StackingProperty,
  StackingSetResult,
  StackingSide,
  StackingSource,
  StackingValue,
  StackingValues,
};
