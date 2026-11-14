import { spaceStackCopy } from "./copy.js";
import type { StyleValues } from "./css-value-model.js";

type StackAxis = "x" | "y";

interface SpaceStack {
  readonly axis: StackAxis;
  readonly gap: string | null;
  readonly isEditable: boolean;
}

interface StackNote {
  readonly text: string;
  readonly tip: string;
}

const STACK_PATTERN = /^(?<sign>-?)space-(?<axis>[xy])-(?<suffix>.+)$/u;

const ARBITRARY_PATTERN = /^\[(?<amount>\d+(?:\.\d+)?)(?<unit>px|rem)\]$/u;

const STEP_PATTERN = /^\d+(?:\.\d+)?$/u;

const LAYOUT_CLASSES: ReadonlySet<string> = new Set([
  "flex",
  "inline-flex",
  "grid",
  "inline-grid",
]);

const SPACING_PX = 4;

const REM_PX = 16;

const REVERSE = "reverse";

const toAxis = (text: string | null): StackAxis | null => {
  if (text === "x" || text === "y") {
    return text;
  }

  return null;
};

const toArbitraryPx = (suffix: string): number | null => {
  const groups = ARBITRARY_PATTERN.exec(suffix)?.groups ?? null;

  if (groups === null) {
    return null;
  }

  const amount = Number(groups.amount);

  if (groups.unit === "rem") {
    return amount * REM_PX;
  }

  return amount;
};

const toSuffixPx = (suffix: string): number | null => {
  if (suffix === "px") {
    return 1;
  }

  if (STEP_PATTERN.test(suffix)) {
    return Number(suffix) * SPACING_PX;
  }

  return toArbitraryPx(suffix);
};

const toGapText = (px: number | null): string | null => {
  if (px === null) {
    return null;
  }

  return `${px}px`;
};

interface StackClass {
  readonly axis: StackAxis;
  readonly isNegative: boolean;
  readonly suffix: string;
}

const toStackClass = (raw: string): StackClass | null => {
  const groups = STACK_PATTERN.exec(raw)?.groups ?? null;
  const axis = toAxis(groups?.axis ?? null);

  if (groups === null || axis === null) {
    return null;
  }

  return {
    axis,
    isNegative: groups.sign === "-",
    suffix: groups.suffix ?? "",
  };
};

const toSpaceStack = (classes: readonly string[] | null): SpaceStack | null => {
  if (classes === null || classes.some((raw) => LAYOUT_CLASSES.has(raw))) {
    return null;
  }

  const found = classes.flatMap((raw) => {
    const entry = toStackClass(raw);

    if (entry === null) {
      return [];
    }

    return [entry];
  });

  const main = found.find((entry) => entry.suffix !== REVERSE) ?? null;

  if (main === null) {
    return null;
  }

  const stackGap = toGapText(toSuffixPx(main.suffix));
  const isReversed = found.some((entry) => entry.suffix === REVERSE);

  return {
    axis: main.axis,
    gap: stackGap,
    isEditable: stackGap !== null && !main.isNegative && !isReversed,
  };
};

const toDirectionValue = (axis: StackAxis): string => {
  if (axis === "y") {
    return "column";
  }

  return "row";
};

const toStackValues = (values: StyleValues, stack: SpaceStack): StyleValues => {
  const gap = stack.gap ?? "0px";

  return {
    ...values,
    "column-gap": gap,
    display: "flex",
    "flex-direction": toDirectionValue(stack.axis),
    "flex-wrap": "nowrap",
    gap,
    "row-gap": gap,
  };
};

const toStackLabel = (axis: StackAxis): string => {
  if (axis === "y") {
    return spaceStackCopy.stackY;
  }

  return spaceStackCopy.stackX;
};

const toStackNote = (stack: SpaceStack): StackNote => {
  const label = toStackLabel(stack.axis);

  if (stack.isEditable) {
    return { text: label, tip: spaceStackCopy.tip };
  }

  return {
    text: `${label}. ${spaceStackCopy.editInCode}`,
    tip: spaceStackCopy.readOnlyTip,
  };
};

export { toSpaceStack, toStackNote, toStackValues };

export type { SpaceStack, StackAxis, StackNote };
