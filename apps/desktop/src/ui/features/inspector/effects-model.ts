import type { ShiftPart } from "./css-values.js";
import { formatShadows, parseShadows } from "./shadows.js";
import type { Shadow } from "./shadows.js";
import type { DirectEdit } from "./use-direct-edit.js";

type Part = "x" | "y" | "blur" | "spread";

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

const eachList = (
  raw: string,
  change: (list: Shadow[]) => Shadow[]
): string => {
  const list = parseShadows(raw);

  return list ? formatShadows(change(list)) : raw;
};

const fieldPart = (index: number, field: Field): ShiftPart => ({
  key: `${index}.${field}`,
  map: (raw, change) =>
    eachList(raw, (list) =>
      list.map((s, i) =>
        i === index
          ? {
              ...s,
              [field]: change(s[field]) || (field === "color" ? s.color : "0"),
            }
          : s
      )
    ),
});

const writeShadows = (
  edit: DirectEdit,
  view: ShadowView,
  change: (list: Shadow[]) => Shadow[]
): void => {
  if (view.mixed) {
    opCount += 1;
    edit.shift(
      ["box-shadow"],
      0,
      {},
      { key: `op${opCount}`, map: (raw) => eachList(raw, change), set: "" }
    );
  } else {
    edit.preview({ "box-shadow": formatShadows(change(view.list)) });
  }

  edit.commit();
};

const mixedFields = (lists: Shadow[][]): Set<string> => {
  const first = lists[0] ?? [];
  const mixed = new Set<string>();
  first.forEach((shadow, index) => {
    for (const field of FIELDS) {
      if (lists.some((list) => list[index]?.[field] !== shadow[field])) {
        mixed.add(`${index}.${field}`);
      }
    }
  });

  return mixed;
};

const shadowView = (edit: DirectEdit): ShadowView | null => {
  if (!edit.mixed.has("box-shadow")) {
    const list = parseShadows(edit.values["box-shadow"]);

    return list ? { list, mixed: null } : null;
  }

  const lists = (edit.each ?? []).map((values) =>
    parseShadows(values["box-shadow"])
  );

  const first = lists[0];

  if (
    !first ||
    first.length === 0 ||
    lists.some((list) => list === null || list.length !== first.length)
  ) {
    return null;
  }

  const mixed = mixedFields(lists as Shadow[][]);

  return {
    list: first.map((shadow, index) => ({
      ...shadow,
      ...Object.fromEntries(
        FIELDS.filter((field) => mixed.has(`${index}.${field}`)).map(
          (field) => [field, ""]
        )
      ),
    })),
    mixed,
  };
};

export {
  PARTS,
  FIELDS,
  eachList,
  fieldPart,
  writeShadows,
  mixedFields,
  shadowView,
};

export type { Part, Field, ShadowView };
