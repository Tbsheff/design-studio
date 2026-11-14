import { parseClass } from "./classes.js";
import type { ParsedClass, SideValue, SingleGroup } from "./classes.js";
import type { ClassEdit } from "./plan.js";

type StackAxis = "x" | "y";

interface SpaceStack {
  readonly axis: StackAxis;
  readonly isInherited: boolean;
  readonly raw: string;
  readonly suffix: string;
  readonly variants: string;
}

type GapEdit = Extract<ClassEdit, { kind: "sided" }>;

const STACK_PATTERN = /^space-(?<axis>[xy])-(?<suffix>.+)$/u;

const FLEX_DIRECTION: SingleGroup = "flex-direction";

const DISPLAY: SingleGroup = "display";

const REVERSE = "reverse";

const ARBITRARY_PATTERN = /^\[(?<amount>\d+(?:\.\d+)?)(?<unit>px|rem)\]$/u;

const PX_STEP = 0.25;

const REM_STEPS = 4;

const LAYOUT_DISPLAYS: ReadonlySet<string> = new Set([
  "flex",
  "inline-flex",
  "grid",
  "inline-grid",
]);

const LAYOUT_GROUPS: ReadonlySet<SingleGroup> = new Set<SingleGroup>([
  FLEX_DIRECTION,
  "flex-wrap",
  "justify",
  "items",
]);

const isLayoutClass = (raw: string, variants: string): boolean => {
  const parsed = parseClass(raw);

  return parsed.variants === variants && LAYOUT_DISPLAYS.has(parsed.utility);
};

const isPlainStack = (parsed: ParsedClass): boolean =>
  !parsed.negative && !parsed.important;

const toAxis = (text: string | null): StackAxis | null => {
  if (text === "x" || text === "y") {
    return text;
  }

  return null;
};

const toStackOf = (raw: string): SpaceStack | null => {
  const parsed = parseClass(raw);
  const groups = STACK_PATTERN.exec(parsed.utility)?.groups ?? null;
  const axis = toAxis(groups?.axis ?? null);
  const suffix = groups?.suffix ?? REVERSE;

  if (!isPlainStack(parsed) || axis === null || suffix === REVERSE) {
    return null;
  }

  const { variants } = parsed;
  const isInherited = false;

  return { axis, isInherited, raw, suffix, variants };
};

const isReversed = (raw: string, stack: SpaceStack): boolean => {
  const parsed = parseClass(raw);

  return (
    parsed.variants === stack.variants &&
    parsed.utility === `space-${stack.axis}-${REVERSE}`
  );
};

const toStacksAt = (
  classes: readonly string[],
  variants: string
): SpaceStack[] => {
  const found = classes.flatMap((raw) => {
    const entry = toStackOf(raw);

    if (entry === null || entry.variants !== variants) {
      return [];
    }

    return [entry];
  });

  return (["y", "x"] as const).flatMap((axis) => {
    const entry = found.find((stack) => stack.axis === axis) ?? null;

    if (entry === null) {
      return [];
    }

    return [entry];
  });
};

const isBlocked = (
  classes: readonly string[],
  stacks: readonly SpaceStack[]
): boolean =>
  stacks.some((stack) =>
    classes.some(
      (raw) => isReversed(raw, stack) || isLayoutClass(raw, stack.variants)
    )
  );

const toInherited = (stack: SpaceStack, variants: string): SpaceStack => ({
  ...stack,
  isInherited: true,
  variants,
});

const toOpenStacks = (
  classes: readonly string[],
  stacks: SpaceStack[]
): SpaceStack[] => {
  if (isBlocked(classes, stacks)) {
    return [];
  }

  return stacks;
};

const toSpaceStacks = (
  classes: readonly string[],
  variants: string
): SpaceStack[] => {
  const own = toStacksAt(classes, variants);

  if (own.length > 0 || variants === "") {
    return toOpenStacks(classes, own);
  }

  return toOpenStacks(classes, toStacksAt(classes, "")).map((stack) =>
    toInherited(stack, variants)
  );
};

const isGapEdit = (edit: ClassEdit): edit is GapEdit =>
  edit.kind === "sided" && edit.group === "gap";

const isLayoutEdit = (edit: ClassEdit): boolean => {
  if (edit.kind !== "single" || edit.token === null) {
    return false;
  }

  if (edit.group === DISPLAY) {
    return LAYOUT_DISPLAYS.has(edit.token);
  }

  return LAYOUT_GROUPS.has(edit.group);
};

const isGroupEdit = (edit: ClassEdit, group: SingleGroup): boolean =>
  edit.kind === "single" && edit.group === group;

const toGroupEdit = (
  edits: readonly ClassEdit[],
  group: SingleGroup,
  fallback: ClassEdit
): ClassEdit => edits.find((edit) => isGroupEdit(edit, group)) ?? fallback;

const toDirectionEdits = (
  stack: SpaceStack,
  edits: readonly ClassEdit[]
): ClassEdit[] => {
  const fallback: ClassEdit = {
    group: FLEX_DIRECTION,
    kind: "single",
    token: "flex-col",
    variants: stack.variants,
  };

  const direction = toGroupEdit(edits, FLEX_DIRECTION, fallback);

  if (direction === fallback && stack.axis === "x") {
    return [];
  }

  return [direction];
};

const toSuffixAmount = (suffix: string): number => {
  if (suffix === "px") {
    return PX_STEP;
  }

  const groups = ARBITRARY_PATTERN.exec(suffix)?.groups ?? null;

  if (groups === null) {
    return Number(suffix) || 0;
  }

  if (groups.unit === "rem") {
    return Number(groups.amount) * REM_STEPS;
  }

  return Number(groups.amount) * PX_STEP;
};

const toMainStack = (stacks: readonly SpaceStack[]): SpaceStack | null => {
  const [first = null, second = null] = stacks;

  if (
    first !== null &&
    second !== null &&
    toSuffixAmount(second.suffix) > toSuffixAmount(first.suffix)
  ) {
    return second;
  }

  return first;
};

const toAxisValue = (
  stacks: readonly SpaceStack[],
  axis: StackAxis,
  main: SpaceStack
): SideValue => {
  const stack = stacks.find((entry) => entry.axis === axis) ?? main;

  return { negative: false, suffix: stack.suffix };
};

const toConvertEdits = (
  stacks: readonly SpaceStack[],
  main: SpaceStack,
  edits: readonly ClassEdit[]
): ClassEdit[] => {
  const { variants } = main;

  const display = toGroupEdit(edits, DISPLAY, {
    group: DISPLAY,
    kind: "single",
    token: "flex",
    variants,
  });

  const rest = edits.filter(
    (edit) => !isGroupEdit(edit, DISPLAY) && !isGroupEdit(edit, FLEX_DIRECTION)
  );

  const values = {
    x: toAxisValue(stacks, "x", main),
    y: toAxisValue(stacks, "y", main),
  };

  return [
    ...stacks.map((stack): ClassEdit => ({ kind: "remove", token: stack.raw })),
    display,
    ...toDirectionEdits(main, edits),
    { group: "gap", kind: "sided", values, variants },
    ...rest,
  ];
};

const toLayoutEdits = (
  stacks: readonly SpaceStack[],
  main: SpaceStack,
  edits: readonly ClassEdit[]
): ClassEdit[] => {
  if (main.isInherited) {
    return [...edits];
  }

  return toConvertEdits(stacks, main, edits);
};

const toStackToken = (
  stack: SpaceStack,
  value: SideValue | null
): ClassEdit[] => {
  if (value === null || value.negative || value.suffix === "0") {
    return [];
  }

  return [
    {
      kind: "add",
      token: `${stack.variants}space-${stack.axis}-${value.suffix}`,
    },
  ];
};

const toRemoveStack = (stack: SpaceStack): ClassEdit[] => {
  if (stack.isInherited) {
    return [];
  }

  return [{ kind: "remove", token: stack.raw }];
};

const isStackGap = (edit: ClassEdit, variants: string): edit is GapEdit =>
  isGapEdit(edit) && edit.variants === variants;

const toAxisGapEdits = (
  stack: SpaceStack,
  edits: readonly ClassEdit[]
): ClassEdit[] => {
  const last =
    edits.findLast(
      (edit) => isStackGap(edit, stack.variants) && stack.axis in edit.values
    ) ?? null;

  if (last === null || !isGapEdit(last)) {
    return [];
  }

  return [
    ...toRemoveStack(stack),
    ...toStackToken(stack, last.values[stack.axis] ?? null),
  ];
};

const toGapStackEdits = (
  stacks: readonly SpaceStack[],
  main: SpaceStack,
  edits: readonly ClassEdit[]
): ClassEdit[] => [
  ...edits.filter((edit) => !isStackGap(edit, main.variants)),
  ...stacks.flatMap((stack) => toAxisGapEdits(stack, edits)),
];

const toEditVariants = (edits: readonly ClassEdit[]): string => {
  for (const edit of edits) {
    if (edit.kind === "sided" || edit.kind === "single") {
      return edit.variants;
    }
  }

  return "";
};

const toSpaceStackEdits = (
  classes: readonly string[],
  edits: readonly ClassEdit[]
): ClassEdit[] => {
  const stacks = toSpaceStacks(classes, toEditVariants(edits));
  const main = toMainStack(stacks);

  if (main === null) {
    return [...edits];
  }

  if (edits.some((edit) => isLayoutEdit(edit))) {
    return toLayoutEdits(stacks, main, edits);
  }

  if (!edits.some((edit) => isGapEdit(edit))) {
    return [...edits];
  }

  return toGapStackEdits(stacks, main, edits);
};

export { toSpaceStackEdits };
