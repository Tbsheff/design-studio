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

const PX_SUFFIX = /px$/u;

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

const toMeasuredGap = (measured: string | null): string | null => {
  if (measured === null) {
    return null;
  }

  const amount = Number(measured.replace(PX_SUFFIX, ""));

  if (Number.isNaN(amount) || amount <= 0) {
    return null;
  }

  return measured;
};

const VARIANT_STACK_PATTERN = /^(?<prefix>.+:)(?<rest>-?space-[xy]-.+)$/u;

const toStackClasses = (classes: readonly string[]): StackClass[] =>
  classes.flatMap((raw) => {
    const entry = toStackClass(raw);

    if (entry === null) {
      return [];
    }

    return [entry];
  });

const toVariantStacks = (set: readonly string[]): StackClass[] =>
  toStackClasses(
    set.flatMap((raw) => {
      const rest = VARIANT_STACK_PATTERN.exec(raw)?.groups?.rest ?? null;

      if (rest === null) {
        return [];
      }

      return [rest];
    })
  );

const toOpenStacks = (found: readonly StackClass[]): StackClass[] =>
  found.filter((entry) => entry.suffix !== REVERSE);

const toPickedStacks = (
  base: readonly StackClass[],
  variant: readonly StackClass[]
): StackClass[] => {
  const open = toOpenStacks(variant);

  return [
    ...open,
    ...toOpenStacks(base).filter(
      (entry) => !open.some((picked) => picked.axis === entry.axis)
    ),
  ];
};

const toAmount = (entry: StackClass): number => toSuffixPx(entry.suffix) ?? 0;

const toMainClass = (stacks: readonly StackClass[]): StackClass | null => {
  const ordered = [
    ...stacks.filter((entry) => entry.axis === "y"),
    ...stacks.filter((entry) => entry.axis === "x"),
  ];

  const [first = null, second = null] = ordered;

  if (first !== null && second !== null && toAmount(second) > toAmount(first)) {
    return second;
  }

  return first;
};

const isResponsiveStack = (classes: readonly string[]): boolean =>
  classes.some((raw) => VARIANT_STACK_PATTERN.test(raw));

const toStackGap = (
  main: StackClass,
  measured: string | null,
  isResponsive: boolean
): string | null => {
  const fromClass = toGapText(toSuffixPx(main.suffix));

  if (isResponsive) {
    return fromClass;
  }

  return toMeasuredGap(measured) ?? fromClass;
};

const toSpaceStack = (
  classes: readonly string[] | null,
  variantSet: readonly string[],
  measured: Readonly<Record<StackAxis, string | null>>
): SpaceStack | null => {
  if (classes === null || classes.some((raw) => LAYOUT_CLASSES.has(raw))) {
    return null;
  }

  const found = toStackClasses(classes);
  const main = toMainClass(toPickedStacks(found, toVariantStacks(variantSet)));

  if (main === null) {
    return null;
  }

  const stackGap = toStackGap(
    main,
    measured[main.axis],
    isResponsiveStack(classes)
  );

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
