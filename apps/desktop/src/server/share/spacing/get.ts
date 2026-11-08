import type { SpacingScope } from "./commit.js";
import { BOX_SIDES, classify, lengthToPx, parseClass } from "./deps.js";
import type {
  BoxSide,
  SourceLoc,
  SpacingInfo,
  SpacingRect,
  SpacingValue,
  TailwindTheme,
} from "./deps.js";
import { loadSpacingSite } from "./site.js";
import type { SpacingSite } from "./site.js";

interface SpacingElement {
  readonly rect: SpacingRect;
  readonly styles: Readonly<Record<string, string>>;
}

type Slot =
  | "column"
  | "margin-bottom"
  | "margin-left"
  | "margin-right"
  | "margin-top"
  | "padding-bottom"
  | "padding-left"
  | "padding-right"
  | "padding-top"
  | "row";

interface ClassHit {
  readonly className: string;
  readonly token: string;
}

const BOX_LETTERS = new Map<string, readonly BoxSide[]>([
  ["b", ["bottom"]],
  ["l", ["left"]],
  ["r", ["right"]],
  ["t", ["top"]],
  ["x", ["left", "right"]],
  ["y", ["top", "bottom"]],
]);

const GAP_LETTERS = new Map<string, readonly Slot[]>([
  ["x", ["column"]],
  ["y", ["row"]],
]);

const PX_TOLERANCE = 0.01;

const toSlotsOf = (group: string, side: string): readonly Slot[] => {
  if (group === "gap") {
    return GAP_LETTERS.get(side) ?? [];
  }

  if (group !== "padding" && group !== "margin") {
    return [];
  }

  return (BOX_LETTERS.get(side) ?? []).map((box) => `${group}-${box}` as Slot);
};

const toClassSlots = (
  raw: string,
  theme: TailwindTheme | null
): [Slot, ClassHit][] => {
  const parsed = parseClass(raw);

  if (parsed.variants) {
    return [];
  }

  const cls = classify(parsed, theme);

  if (!cls || cls.kind !== "sided") {
    return [];
  }

  const hit = { className: raw, token: cls.value.suffix };

  return cls.sides.flatMap((side) =>
    toSlotsOf(cls.group, side).map((slot): [Slot, ClassHit] => [slot, hit])
  );
};

const toClassMap = (site: SpacingSite): Map<Slot, ClassHit> => {
  if (site.mode !== "classes") {
    return new Map();
  }

  return new Map(site.classes.flatMap((raw) => toClassSlots(raw, site.theme)));
};

const toBoxParts = (value: string | undefined): string[] => {
  const parts = (value ?? "").trim().split(/\s+/u).filter(Boolean);
  const [top = "", right = top, bottom = top, left = right] = parts;

  return [top, right, bottom, left];
};

const toGapParts = (value: string | undefined): [string, string] => {
  const parts = (value ?? "").trim().split(/\s+/u).filter(Boolean);
  const [row = "", column = row] = parts;

  return [row, column];
};

const toComputedOf = (element: SpacingElement | null): Map<Slot, string> => {
  if (!element) {
    return new Map();
  }

  const padding = toBoxParts(element.styles.padding);
  const margin = toBoxParts(element.styles.margin);
  const [row, column] = toGapParts(element.styles.gap);

  return new Map<Slot, string>([
    ...BOX_SIDES.map((side, index): [Slot, string] => [
      `padding-${side}`,
      padding[index] ?? "",
    ]),
    ...BOX_SIDES.map((side, index): [Slot, string] => [
      `margin-${side}`,
      margin[index] ?? "",
    ]),
    ["row", row],
    ["column", column],
  ]);
};

const toThemeMatch = (theme: TailwindTheme, px: number): string | null => {
  const step = px / theme.spacingPx;

  if (Math.abs(step - Math.round(step)) <= PX_TOLERANCE) {
    return String(Math.round(step));
  }

  const named = [...theme.spacing].find(
    ([, size]) => Math.abs(size - px) <= PX_TOLERANCE
  );

  return named?.[0] ?? null;
};

const toEntryMatch = (site: SpacingSite, px: number): string | null =>
  site.entries.find(
    (entry) =>
      entry.type === "dimension" &&
      Math.abs((lengthToPx(entry.value) ?? Number.NaN) - px) <= PX_TOLERANCE
  )?.path ?? null;

const toTokenOf = (site: SpacingSite, px: number | null): string | null => {
  if (px === null) {
    return null;
  }

  if (site.theme && site.mode === "classes") {
    return toThemeMatch(site.theme, px);
  }

  return toEntryMatch(site, px);
};

const toPxOf = (text: string | null): number | null => {
  if (text === null) {
    return null;
  }

  return lengthToPx(text);
};

const toSpacingValue = (
  site: SpacingSite,
  css: string | undefined,
  hit: ClassHit | undefined
): SpacingValue => {
  const text = css || null;
  const px = toPxOf(text);

  return {
    className: hit?.className ?? null,
    css: text,
    px: px ?? null,
    token: hit?.token ?? toTokenOf(site, px),
  };
};

const toSideRecord = (
  site: SpacingSite,
  group: "margin" | "padding",
  computed: Map<Slot, string>,
  classes: Map<Slot, ClassHit>
): Record<BoxSide, SpacingValue> => {
  const pick = (side: BoxSide): SpacingValue => {
    const slot: Slot = `${group}-${side}`;

    return toSpacingValue(site, computed.get(slot), classes.get(slot));
  };

  return {
    bottom: pick("bottom"),
    left: pick("left"),
    right: pick("right"),
    top: pick("top"),
  };
};

const inspectSpacing = async (
  scope: SpacingScope,
  loc: SourceLoc,
  element: SpacingElement | null
): Promise<SpacingInfo> => {
  const site = await loadSpacingSite(scope, loc);
  const classes = toClassMap(site);
  const computed = toComputedOf(element);

  return {
    gap: {
      column: toSpacingValue(
        site,
        computed.get("column"),
        classes.get("column")
      ),
      row: toSpacingValue(site, computed.get("row"), classes.get("row")),
    },
    margin: toSideRecord(site, "margin", computed, classes),
    mode: site.mode,
    padding: toSideRecord(site, "padding", computed, classes),
    rect: element?.rect ?? null,
    source: `${site.relative}:${loc.line}:${loc.col}`,
  };
};

export { inspectSpacing };

export type { SpacingElement };
