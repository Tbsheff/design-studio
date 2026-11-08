import type { ShiftPart } from "./css-values.js";
import { formatShadows, parseShadows } from "./shadows.js";
import type { Shadow } from "./shadows.js";
import type { DirectEdit } from "./use-direct-edit.js";

type Part = "x" | "y" | "blur" | "spread";

const BOX_SHADOW = "box-shadow";
const NO_SHADOW_VALUE = "0";

const PARTS: {
  readonly part: Part;
  readonly short: string;
  readonly label: string;
  readonly min?: number;
}[] = [
  { label: "X offset", part: "x", short: "X" },
  { label: "Y offset", part: "y", short: "Y" },
  { label: "Blur", min: 0, part: "blur", short: "B" },
  { label: "Spread", part: "spread", short: "S" },
];

type Field = Part | "color";

interface ShadowView {
  readonly list: Shadow[];
  readonly mixed: ReadonlySet<string> | null;
}

const FIELDS: Field[] = ["x", "y", "blur", "spread", "color"];
let opCount = 0;

const toChangedShadows = (
  raw: string,
  change: (list: Shadow[]) => Shadow[]
): string => {
  const list = parseShadows(raw);

  if (!list) {
    return raw;
  }

  return formatShadows(change(list));
};

const toFieldFallback = (field: Field, shadow: Shadow): string => {
  if (field === "color") {
    return shadow.color;
  }

  return NO_SHADOW_VALUE;
};

const toChangedShadow = (
  shadow: Shadow,
  field: Field,
  change: (value: string) => string
): Shadow => ({
  ...shadow,
  [field]: change(shadow[field]) || toFieldFallback(field, shadow),
});

const toFieldPart = (index: number, field: Field): ShiftPart => ({
  key: `${index}.${field}`,
  map: (raw, change) =>
    toChangedShadows(raw, (list) => {
      const next = [...list];
      const [target] = next.slice(index, index + 1);

      if (target) {
        next[index] = toChangedShadow(target, field, change);
      }

      return next;
    }),
});

const setShadows = (
  edit: DirectEdit,
  view: ShadowView,
  change: (list: Shadow[]) => Shadow[]
): void => {
  if (view.mixed) {
    opCount += 1;
    edit.shift(
      [BOX_SHADOW],
      0,
      {},
      {
        key: `op${opCount}`,
        map: (raw) => toChangedShadows(raw, change),
        set: "",
      }
    );
  } else {
    edit.preview({ [BOX_SHADOW]: formatShadows(change(view.list)) });
  }

  edit.commit();
};

const getMixedFields = (lists: Shadow[][]): Set<string> => {
  const [first = []] = lists;
  const mixed = new Set<string>();

  for (const [index, shadow] of first.entries()) {
    for (const field of FIELDS) {
      if (lists.some((list) => list[index]?.[field] !== shadow[field])) {
        mixed.add(`${index}.${field}`);
      }
    }
  }

  return mixed;
};

type Blanks = Partial<Record<Field, string>>;

const toBlankMixed = (
  shadow: Shadow,
  index: number,
  mixed: ReadonlySet<string>
): Shadow => {
  const blanks: Blanks = {};

  for (const field of FIELDS) {
    if (mixed.has(`${index}.${field}`)) {
      blanks[field] = "";
    }
  }

  return { ...shadow, ...blanks };
};

const toShadowLists = (edit: DirectEdit): (Shadow[] | null)[] =>
  (edit.each ?? []).map((values) => parseShadows(values[BOX_SHADOW]));

const getShadowView = (edit: DirectEdit): ShadowView | null => {
  if (!edit.mixed.has(BOX_SHADOW)) {
    const list = parseShadows(edit.values[BOX_SHADOW]);

    if (!list) {
      return null;
    }

    return { list, mixed: null };
  }

  const lists = toShadowLists(edit);
  const [first] = lists;

  if (!first || first.length === 0) {
    return null;
  }

  const all: Shadow[][] = [];

  for (const list of lists) {
    if (list === null || list.length !== first.length) {
      return null;
    }

    all.push(list);
  }

  const mixed = getMixedFields(all);

  return {
    list: first.map((shadow, index) => toBlankMixed(shadow, index, mixed)),
    mixed,
  };
};

const toShadowRows = (
  view: ShadowView
): readonly { readonly id: string; readonly index: number }[] =>
  view.list.map((_shadow, index) => ({ id: `shadow-${index}`, index }));

export { PARTS, FIELDS, toFieldPart, toShadowRows, setShadows, getShadowView };

export type { Part, Field, ShadowView };
