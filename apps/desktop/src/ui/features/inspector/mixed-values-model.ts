import type {
  DirectEditRequest,
  DirectStyleProperty,
  SelectionContext,
  SourceLoc,
} from "@design-studio/contracts";

import {
  toChangedProps,
  toShiftedPart,
  toShiftedValue,
  toStyleValues,
} from "./css-value-model.js";
import type { Shift, ShiftPart, StyleValues } from "./css-value-model.js";
import { createEditRequest } from "./edit-request-model.js";
import { toNumberInput } from "./math-input-model.js";

const MAX_MULTI_EDIT = 50;

interface MergedValues {
  readonly values: StyleValues;
  readonly mixed: ReadonlySet<DirectStyleProperty>;
}

const ALL_PROPS = Object.keys(toStyleValues({})) as DirectStyleProperty[];

const toMergedValues = (list: StyleValues[]): MergedValues => {
  const first = list[0] ?? toStyleValues({});
  const values = { ...first };
  const mixed = new Set<DirectStyleProperty>();

  for (const prop of ALL_PROPS) {
    if (list.some((styleValues) => styleValues[prop] !== first[prop])) {
      values[prop] = "";
      mixed.add(prop);
    }
  }

  return { mixed, values };
};

const toLocEntry = (selection: SelectionContext): SourceLoc | null => {
  if (selection.usedBy?.root && selection.usedAt) {
    return selection.usedAt;
  }

  return selection.source;
};

const toLocKey = (selection: SelectionContext): string | null => {
  const entry = toLocEntry(selection);

  if (!entry) {
    return null;
  }

  return `${entry.file}:${entry.line}:${entry.col}`;
};

const toMultiBlockReason = (selections: SelectionContext[]): string | null => {
  if (selections.length > MAX_MULTI_EDIT) {
    return `Select ${MAX_MULTI_EDIT} elements or fewer to edit them together.`;
  }

  if (selections.some((selectionContext) => !selectionContext.source)) {
    return "Some elements have no source location. Ask the agent to change them in Chat.";
  }

  const keys = selections.map((entry) => toLocKey(entry));

  if (new Set(keys).size !== keys.length) {
    return "Some elements come from one line of code, such as a list. Select one of them, or ask the agent in Chat.";
  }

  return null;
};

interface PartShift extends Shift {
  readonly part: ShiftPart;
}

type PartShifts = Record<string, PartShift>;

interface PropShift extends Shift {
  readonly parts?: PartShifts;
}

type Shifts = Partial<Record<DirectStyleProperty, PropShift>>;

const toShiftedProp = (raw: string, shift: PropShift): string | null => {
  let value: string | null = raw;

  if (shift.delta !== 0) {
    value = toShiftedValue(raw, shift);
  }

  if (value === null) {
    return null;
  }

  for (const part of Object.values(shift.parts ?? {})) {
    value = toShiftedPart(value, part.part, part);
  }

  return value;
};

const toShiftedStyle = (
  base: StyleValues,
  shifts: Shifts
): Partial<StyleValues> => {
  const style: Partial<StyleValues> = {};

  for (const [prop, shift] of Object.entries(shifts) as [
    DirectStyleProperty,
    PropShift,
  ][]) {
    const next = toShiftedProp(base[prop], shift);

    if (next !== null) {
      style[prop] = next;
    }
  }

  return toChangedProps(style, base);
};

const toBoundsOf = (shift: PropShift | null): Omit<Shift, "delta"> => {
  if (!shift) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(shift).filter(([key]) => key === "max" || key === "min")
  ) as Omit<Shift, "delta">;
};

const toPartSet = (part: ShiftPart, set: string | null): ShiftPart => {
  const base = { key: part.key, map: part.map };

  if (set === null) {
    return base;
  }

  return { ...base, set };
};

const toPartDelta = (
  part: ShiftPart,
  old: PartShift | null,
  delta: number
): number => {
  if (Object.hasOwn(part, "set")) {
    return 0;
  }

  return (old?.delta ?? 0) + delta;
};

const toWithPart = (
  prev: PropShift | null,
  part: ShiftPart,
  delta: number,
  bounds: Omit<Shift, "delta">
): PropShift => {
  const old = prev?.parts?.[part.key] ?? null;

  const others = Object.entries(prev?.parts ?? {}).filter(
    ([key]) => key !== part.key
  );

  const set = part.set ?? old?.part.set ?? null;

  const entry: PartShift = {
    ...bounds,
    delta: toPartDelta(part, old, delta),
    part: toPartSet(part, set),
  };

  return {
    ...toBoundsOf(prev),
    delta: prev?.delta ?? 0,
    parts: Object.fromEntries([...others, [part.key, entry]]),
  };
};

const toPropShift = (
  prev: PropShift | null,
  delta: number,
  bounds: Omit<Shift, "delta">
): PropShift => ({
  ...prev,
  ...bounds,
  delta: (prev?.delta ?? 0) + delta,
});

interface ShiftChange {
  readonly bounds: Omit<Shift, "delta">;
  readonly delta: number;
  readonly part: ShiftPart | null;
}

const toNextShift = (
  prev: PropShift | null,
  change: ShiftChange
): PropShift => {
  if (change.part) {
    return toWithPart(prev, change.part, change.delta, change.bounds);
  }

  return toPropShift(prev, change.delta, change.bounds);
};

const insertShift = (
  shifts: Shifts,
  props: readonly DirectStyleProperty[],
  change: ShiftChange
): Shifts => {
  const next = { ...shifts };

  for (const prop of props) {
    next[prop] = toNextShift(next[prop] ?? null, change);
  }

  return next;
};

const toLeftPart = (
  part: PartShift,
  sent: PartShift | null
): PartShift | null => {
  const isSame = sent !== null && sent.part.set === part.part.set;

  let { delta } = part;
  let set = part.part.set ?? null;

  if (isSame) {
    delta = part.delta - sent.delta;
    set = null;
  }

  if (delta === 0 && set === null) {
    return null;
  }

  return { ...part, delta, part: toPartSet(part.part, set) };
};

const toLeftParts = (cur: PropShift, done: PropShift): PartShifts =>
  Object.fromEntries(
    Object.entries(cur.parts ?? {}).flatMap(([key, part]) => {
      const left = toLeftPart(part, done.parts?.[key] ?? null);

      if (left) {
        return [[key, left]];
      }

      return [];
    })
  );

const toLeftShift = (cur: PropShift, done: PropShift): PropShift | null => {
  const delta = cur.delta - done.delta;
  const parts = toLeftParts(cur, done);

  if (delta === 0 && Object.keys(parts).length === 0) {
    return null;
  }

  return { ...cur, delta, parts };
};

const toWithoutShifts = (
  shifts: Shifts,
  props: readonly string[],
  sent: Shifts
): Shifts => {
  const removed = new Set<string>(props);

  return Object.fromEntries(
    Object.entries(shifts).flatMap(([prop, cur]) => {
      if (removed.has(prop)) {
        return [];
      }

      const done = sent[prop as DirectStyleProperty];

      if (!done) {
        return [[prop, cur]];
      }

      const left = toLeftShift(cur, done);

      if (left) {
        return [[prop, left]];
      }

      return [];
    })
  );
};

interface OwnEditContext {
  readonly editVariant: string;
  readonly shifts: Shifts;
}

interface OwnEdit {
  readonly edit: DirectEditRequest;
  readonly style: Partial<StyleValues>;
}

const toOwnEdits = (
  selections: SelectionContext[],
  bases: StyleValues[],
  style: Partial<StyleValues>,
  context: OwnEditContext
): OwnEdit[] => {
  const out: OwnEdit[] = [];
  const { editVariant, shifts } = context;

  for (const [index, selection] of selections.entries()) {
    const base = bases[index] ?? toStyleValues(selection.styles);

    const own = {
      ...toChangedProps(style, base),
      ...toShiftedStyle(base, shifts),
    };

    const edit = createEditRequest(selection, own, null, editVariant);

    if (edit) {
      out.push({ edit, style: own });
    }
  }

  return out;
};

const toBatchEdits = (
  selections: SelectionContext[],
  bases: StyleValues[],
  style: Partial<StyleValues>
): DirectEditRequest[] =>
  toOwnEdits(selections, bases, style, { editVariant: "", shifts: {} }).map(
    (item) => item.edit
  );

const hasCurrentDependency = (raw: string, unit: string): boolean =>
  toNumberInput(raw, `0${unit}`, unit) !== toNumberInput(raw, `1${unit}`, unit);

export {
  MAX_MULTI_EDIT,
  toMergedValues,
  toMultiBlockReason,
  toShiftedStyle,
  insertShift,
  toWithoutShifts,
  toOwnEdits,
  toBatchEdits,
  hasCurrentDependency,
};

export type {
  ShiftChange,
  MergedValues,
  Shift,
  ShiftPart,
  PartShift,
  PropShift,
  Shifts,
  OwnEdit,
};
