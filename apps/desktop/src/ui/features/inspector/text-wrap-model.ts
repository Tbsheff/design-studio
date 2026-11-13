import type { StyleValues } from "./css-value-model.js";

type TextWrap = "balance" | "default" | "nowrap" | "pretty";

interface ClassChange {
  readonly add: string[];
  readonly remove: string[];
}

interface TextWrapOption {
  readonly label: string;
  readonly tip: string;
  readonly value: TextWrap;
}

const PROP = "text-wrap";

const WRAP_CLASSES: readonly (readonly [string, TextWrap])[] = [
  ["text-balance", "balance"],
  ["text-nowrap", "nowrap"],
  ["text-pretty", "pretty"],
  ["text-wrap", "default"],
];

const WRAP_BY_CLASS: ReadonlyMap<string, TextWrap> = new Map(WRAP_CLASSES);

const WRAP_BY_VALUE: ReadonlyMap<string, TextWrap> = new Map([
  ["balance", "balance"],
  ["nowrap", "nowrap"],
  ["pretty", "pretty"],
]);

const CLASS_BY_WRAP = {
  balance: "text-balance",
  default: null,
  nowrap: "text-nowrap",
  pretty: "text-pretty",
} as const satisfies Readonly<Record<TextWrap, string | null>>;

const STYLE_BY_WRAP = {
  balance: "balance",
  default: "",
  nowrap: "nowrap",
  pretty: "pretty",
} as const satisfies Readonly<Record<TextWrap, string>>;

const toClassWrap = (classes: readonly string[] | null): TextWrap | null => {
  const owned = (classes ?? []).filter((name) => WRAP_BY_CLASS.has(name));
  const last = owned.at(-1) ?? "";

  return WRAP_BY_CLASS.get(last) ?? null;
};

const toTextWrap = (
  values: Partial<StyleValues>,
  classes: readonly string[] | null
): TextWrap => {
  const raw = (values[PROP] ?? "").trim().toLowerCase();

  if (raw !== "") {
    return WRAP_BY_VALUE.get(raw) ?? "default";
  }

  return toClassWrap(classes) ?? "default";
};

const toClassChange = (wrap: TextWrap): ClassChange => {
  const wanted = CLASS_BY_WRAP[wrap];
  const add: string[] = [];
  const remove: string[] = [];

  for (const [name] of WRAP_CLASSES) {
    if (name === wanted) {
      add.push(name);
    } else {
      remove.push(name);
    }
  }

  return { add, remove };
};

const toStyleChange = (wrap: TextWrap): Partial<StyleValues> => ({
  [PROP]: STYLE_BY_WRAP[wrap],
});

export { toClassChange, toStyleChange, toTextWrap };

export type { ClassChange, TextWrap, TextWrapOption };
