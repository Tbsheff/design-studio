import type { SelectionContext } from "./actions/_core/contracts.js";

const SPACING_PROPERTIES = [
  "padding",
  "margin",
  "gap",
  "row-gap",
  "column-gap",
] as const;

const SPACING_SIDES = [
  "all",
  "x",
  "y",
  "top",
  "right",
  "bottom",
  "left",
] as const;

const BOX_SIDES = ["top", "right", "bottom", "left"] as const;

const SPACING_TOKEN = /^(?:--)?[A-Za-z0-9_.-]{1,80}$/u;

const SPACING_PX_MAX = 4000;

type SpacingProperty = (typeof SPACING_PROPERTIES)[number];

type SpacingSide = (typeof SPACING_SIDES)[number];

type BoxSide = (typeof BOX_SIDES)[number];

interface SpacingInput {
  readonly property: SpacingProperty;
  readonly side: SpacingSide;
  readonly snap: boolean;
  readonly token: string | null;
  readonly value: number | null;
}

interface SpacingValue {
  readonly className: string | null;
  readonly css: string | null;
  readonly px: number | null;
  readonly token: string | null;
}

type SpacingRect = Readonly<SelectionContext["rect"]>;

interface SpacingInfo {
  readonly gap: { readonly column: SpacingValue; readonly row: SpacingValue };
  readonly margin: Readonly<Record<BoxSide, SpacingValue>>;
  readonly mode: "classes" | "css";
  readonly padding: Readonly<Record<BoxSide, SpacingValue>>;
  readonly rect: SpacingRect | null;
  readonly source: string;
}

interface SpacingSetResult {
  readonly classes: {
    readonly add: string[];
    readonly remove: string[];
  } | null;
  readonly files: string[];
  readonly mode: "classes" | "css";
  readonly style: Readonly<Record<string, string>>;
  readonly title: string;
  readonly token: string | null;
  readonly versionId: string | null;
}

export {
  BOX_SIDES,
  SPACING_PROPERTIES,
  SPACING_PX_MAX,
  SPACING_SIDES,
  SPACING_TOKEN,
};

export type {
  BoxSide,
  SpacingInfo,
  SpacingInput,
  SpacingProperty,
  SpacingRect,
  SpacingSetResult,
  SpacingSide,
  SpacingValue,
};
