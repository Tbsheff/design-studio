import type { PortDiff } from "@design-studio/actions/port/schema";

import { PAIR_PROPERTIES } from "./port-pairs-probe.js";
import type { PairNode } from "./port-pairs-probe.js";

type PairProperty = (typeof PAIR_PROPERTIES)[number];

interface ValueRule {
  readonly min: number;
  readonly name: string;
  readonly source: PairProperty;
}

const LENGTH_MIN = 2;

const STEP_MIN = 1;

const BORDER_MIN = 1;

const BORDER_WIDTH = "border-width";

const GAP: PairProperty = "gap";

const PX = /px$/u;

const NORMAL_PX = /^normal \((?<px>[\d.]+)px\)$/u;

const NORMAL_LINE = 1.2;

const FONT_SIZE: PairProperty = "font-size";

const LINE_HEIGHT: PairProperty = "line-height";

const BORDER_SIDES: readonly PairProperty[] = [
  "border-top-width",
  "border-right-width",
  "border-bottom-width",
  "border-left-width",
];

const toRule = (source: PairProperty, min: number): ValueRule => {
  const name: string = source;

  return { min, name, source };
};

const VALUE_RULES: readonly ValueRule[] = [
  toRule("margin-top", LENGTH_MIN),
  toRule("margin-bottom", LENGTH_MIN),
  toRule("padding-top", LENGTH_MIN),
  toRule("padding-right", LENGTH_MIN),
  toRule("padding-bottom", LENGTH_MIN),
  toRule("padding-left", LENGTH_MIN),
  toRule(GAP, LENGTH_MIN),
  toRule(FONT_SIZE, STEP_MIN),
  toRule(LINE_HEIGHT, LENGTH_MIN),
  toRule("font-weight", STEP_MIN),
  { min: LENGTH_MIN, name: "border-radius", source: "border-top-left-radius" },
];

const BOX_NAMES: ReadonlySet<string> = new Set(["height", "width"]);

const toRawValue = (node: PairNode, name: PairProperty): string =>
  node.values[PAIR_PROPERTIES.indexOf(name)] ?? "";

const toNumber = (value: string): number | null => {
  const normal = NORMAL_PX.exec(value)?.groups?.["px"] ?? null;
  const parsed = Number((normal ?? value).replace(PX, ""));

  if (value !== "" && Number.isFinite(parsed)) {
    return parsed;
  }

  return null;
};

const toLineHeight = (node: PairNode, value: string): string => {
  const size = toNumber(toRawValue(node, FONT_SIZE));

  if (size === null) {
    return value;
  }

  return `normal (${Math.round(size * NORMAL_LINE)}px)`;
};

const toValue = (node: PairNode, name: PairProperty): string => {
  const value = toRawValue(node, name);

  if (value !== "normal") {
    return value;
  }

  if (name === GAP) {
    return "0px";
  }

  if (name === LINE_HEIGHT) {
    return toLineHeight(node, value);
  }

  return value;
};

const isValueDiff = (app: string, prototype: string, min: number): boolean => {
  const appNumber = toNumber(app);
  const prototypeNumber = toNumber(prototype);

  if (appNumber === null || prototypeNumber === null) {
    return app !== prototype;
  }

  return Math.abs(appNumber - prototypeNumber) >= min;
};

const toSidesText = (sides: readonly string[]): string => {
  if (new Set(sides).size === 1) {
    return sides[0] ?? "";
  }

  return sides.join(" ");
};

const toBorderDiff = (app: PairNode, prototype: PairNode): PortDiff[] => {
  const appSides = BORDER_SIDES.map((side) => toValue(app, side));
  const prototypeSides = BORDER_SIDES.map((side) => toValue(prototype, side));

  const isDiff = appSides.some((value, index) =>
    isValueDiff(value, prototypeSides[index] ?? "", BORDER_MIN)
  );

  if (!isDiff) {
    return [];
  }

  return [
    {
      app: toSidesText(appSides),
      property: BORDER_WIDTH,
      prototype: toSidesText(prototypeSides),
      write: null,
    },
  ];
};

const toBoxDiffs = (app: PairNode, prototype: PairNode): PortDiff[] =>
  [
    { app: app.height, property: "height", prototype: prototype.height },
    { app: app.width, property: "width", prototype: prototype.width },
  ].flatMap((item) => {
    if (Math.abs(item.app - item.prototype) < LENGTH_MIN) {
      return [];
    }

    return [
      {
        app: `${Math.round(item.app)}px`,
        property: item.property,
        prototype: `${Math.round(item.prototype)}px`,
        write: null,
      },
    ];
  });

const toValueDiffs = (app: PairNode, prototype: PairNode): PortDiff[] => [
  ...VALUE_RULES.flatMap((rule) => {
    const appValue = toValue(app, rule.source);
    const prototypeValue = toValue(prototype, rule.source);

    if (!isValueDiff(appValue, prototypeValue, rule.min)) {
      return [];
    }

    return [
      {
        app: appValue,
        property: rule.name,
        prototype: prototypeValue,
        write: null,
      },
    ];
  }),
  ...toBorderDiff(app, prototype),
  ...toBoxDiffs(app, prototype),
];

export { BORDER_WIDTH, BOX_NAMES, toValueDiffs };
