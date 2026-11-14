import { parseClass } from "./classes.js";
import type { ParsedClass, SideValue, SingleGroup } from "./classes.js";
import type { ClassEdit } from "./plan.js";

type StackAxis = "x" | "y";

interface SpaceStack {
  readonly axis: StackAxis;
  readonly raw: string;
  readonly suffix: string;
  readonly variants: string;
}

type GapEdit = Extract<ClassEdit, { kind: "sided" }>;

const STACK_PATTERN = /^space-(?<axis>[xy])-(?<suffix>.+)$/u;

const FLEX_DIRECTION: SingleGroup = "flex-direction";

const DISPLAY: SingleGroup = "display";

const REVERSE = "reverse";

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

  return { axis, raw, suffix, variants: parsed.variants };
};

const isReversed = (raw: string, stack: SpaceStack): boolean => {
  const parsed = parseClass(raw);

  return (
    parsed.variants === stack.variants &&
    parsed.utility === `space-${stack.axis}-${REVERSE}`
  );
};

const toSpaceStack = (
  classes: readonly string[],
  variants: string
): SpaceStack | null => {
  const stack =
    classes
      .map((raw) => toStackOf(raw))
      .find((entry) => entry !== null && entry.variants === variants) ?? null;

  if (
    stack === null ||
    classes.some(
      (raw) => isReversed(raw, stack) || isLayoutClass(raw, variants)
    )
  ) {
    return null;
  }

  return stack;
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

const toConvertEdits = (
  stack: SpaceStack,
  edits: readonly ClassEdit[]
): ClassEdit[] => {
  const { variants } = stack;
  const value: SideValue = { negative: false, suffix: stack.suffix };

  const display = toGroupEdit(edits, DISPLAY, {
    group: DISPLAY,
    kind: "single",
    token: "flex",
    variants,
  });

  const rest = edits.filter(
    (edit) => !isGroupEdit(edit, DISPLAY) && !isGroupEdit(edit, FLEX_DIRECTION)
  );

  return [
    { kind: "remove", token: stack.raw },
    display,
    ...toDirectionEdits(stack, edits),
    { group: "gap", kind: "sided", values: { x: value, y: value }, variants },
    ...rest,
  ];
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

const isStackGap = (edit: ClassEdit, stack: SpaceStack): edit is GapEdit =>
  isGapEdit(edit) && edit.variants === stack.variants;

const toGapStackEdits = (
  stack: SpaceStack,
  edits: readonly ClassEdit[]
): ClassEdit[] => {
  const rest = edits.filter((edit) => !isStackGap(edit, stack));

  const last =
    edits.findLast(
      (edit) => isStackGap(edit, stack) && stack.axis in edit.values
    ) ?? null;

  if (last === null || !isGapEdit(last)) {
    return rest;
  }

  return [
    ...rest,
    { kind: "remove", token: stack.raw },
    ...toStackToken(stack, last.values[stack.axis] ?? null),
  ];
};

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
  const stack = toSpaceStack(classes, toEditVariants(edits));

  if (stack === null) {
    return [...edits];
  }

  if (edits.some((edit) => isLayoutEdit(edit))) {
    return toConvertEdits(stack, edits);
  }

  if (!edits.some((edit) => isGapEdit(edit))) {
    return [...edits];
  }

  return toGapStackEdits(stack, edits);
};

export { toSpaceStackEdits };
