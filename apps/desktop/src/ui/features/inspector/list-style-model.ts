import type { SelectionContext } from "@design-studio/contracts";

import type { StyleValues } from "./css-value-model.js";

type ListType = "decimal" | "disc" | "none";

type ListPosition = "inside" | "outside";

interface ListStyle {
  readonly position: ListPosition;
  readonly type: ListType | null;
}

interface ListClassChange {
  readonly add: string[];
  readonly remove: string[];
}

interface ListTypeOption {
  readonly label: string;
  readonly tip: string;
  readonly value: ListType;
}

const TYPE_PROP = "list-style-type";
const POSITION_PROP = "list-style-position";

const LIST_TAGS: ReadonlySet<string> = new Set(["li", "ol", "ul"]);

const TYPE_CLASSES = {
  decimal: "list-decimal",
  disc: "list-disc",
  none: "list-none",
} as const satisfies Readonly<Record<ListType, string>>;

const POSITION_CLASSES = {
  inside: "list-inside",
  outside: "list-outside",
} as const satisfies Readonly<Record<ListPosition, string>>;

const TYPE_BY_CLASS: ReadonlyMap<string, ListType> = new Map([
  ["list-decimal", "decimal"],
  ["list-disc", "disc"],
  ["list-none", "none"],
]);

const POSITION_BY_CLASS: ReadonlyMap<string, ListPosition> = new Map([
  ["list-inside", "inside"],
  ["list-outside", "outside"],
]);

const TYPE_BY_VALUE: ReadonlyMap<string, ListType> = new Map([
  ["decimal", "decimal"],
  ["disc", "disc"],
  ["none", "none"],
]);

const OWNED_CLASSES: ReadonlySet<string> = new Set([
  ...TYPE_BY_CLASS.keys(),
  ...POSITION_BY_CLASS.keys(),
]);

const isListLayer = (
  selection: SelectionContext | null,
  classes: readonly string[] | null
): boolean => {
  if (selection && LIST_TAGS.has(selection.tag)) {
    return true;
  }

  return (classes ?? []).some((name) => OWNED_CLASSES.has(name));
};

const isListItem = (selection: SelectionContext | null): boolean =>
  selection?.tag === "li";

const toLastOwned = <Value>(
  classes: readonly string[] | null,
  owned: ReadonlyMap<string, Value>
): Value | null => {
  const names = (classes ?? []).filter((name) => owned.has(name));

  return owned.get(names.at(-1) ?? "") ?? null;
};

const toListType = (
  values: Partial<StyleValues>,
  classes: readonly string[] | null
): ListType | null => {
  const raw = (values[TYPE_PROP] ?? "").trim().toLowerCase();

  if (raw !== "") {
    return TYPE_BY_VALUE.get(raw) ?? null;
  }

  return toLastOwned(classes, TYPE_BY_CLASS);
};

const toListPosition = (
  values: Partial<StyleValues>,
  classes: readonly string[] | null
): ListPosition => {
  const raw = (values[POSITION_PROP] ?? "").trim().toLowerCase();

  if (raw === "inside" || raw === "outside") {
    return raw;
  }

  return toLastOwned(classes, POSITION_BY_CLASS) ?? "outside";
};

const toListStyle = (
  values: Partial<StyleValues>,
  classes: readonly string[] | null
): ListStyle => ({
  position: toListPosition(values, classes),
  type: toListType(values, classes),
});

const toSwapChange = (
  wanted: string,
  names: readonly string[]
): ListClassChange => ({
  add: [wanted],
  remove: names.filter((name) => name !== wanted),
});

const toTypeClassChange = (type: ListType): ListClassChange =>
  toSwapChange(TYPE_CLASSES[type], Object.values(TYPE_CLASSES));

const toPositionClassChange = (position: ListPosition): ListClassChange =>
  toSwapChange(POSITION_CLASSES[position], Object.values(POSITION_CLASSES));

const toTypeStyleChange = (type: ListType): Partial<StyleValues> => ({
  [TYPE_PROP]: type,
});

const toPositionStyleChange = (
  position: ListPosition
): Partial<StyleValues> => ({
  [POSITION_PROP]: position,
});

const toOtherPosition = (position: ListPosition): ListPosition => {
  if (position === "inside") {
    return "outside";
  }

  return "inside";
};

export {
  isListItem,
  isListLayer,
  toListStyle,
  toOtherPosition,
  toPositionClassChange,
  toPositionStyleChange,
  toTypeClassChange,
  toTypeStyleChange,
};

export type {
  ListClassChange,
  ListPosition,
  ListStyle,
  ListType,
  ListTypeOption,
};
