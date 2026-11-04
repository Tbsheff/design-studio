import { parseClass, STACKING_OVERFLOWS, STACKING_POSITIONS } from "./deps.js";
import type {
  StackingSide,
  StackingValue,
  StackingValues,
  TailwindTheme,
} from "./deps.js";
import {
  cssValueOf,
  insetValueOf,
  keywordValueOf,
  UNSET,
  zValueOf,
} from "./stacking-value.js";

interface ScopedClass {
  readonly key: string;
  readonly negative: boolean;
  readonly raw: string;
  readonly utility: string;
}

interface CssDeclaration {
  readonly prop: string;
  readonly value: string;
}

type Axis = "x" | "y";

const SIDE_SOURCES: Readonly<Record<StackingSide, readonly string[]>> = {
  bottom: ["inset-", "inset-y-", "bottom-"],
  left: ["inset-", "inset-x-", "left-"],
  right: ["inset-", "inset-x-", "right-"],
  top: ["inset-", "inset-y-", "top-"],
};

const OVERFLOW = new Set<string>(STACKING_OVERFLOWS);

const POSITION = new Set<string>(STACKING_POSITIONS);

const scopedClassesOf = (
  classes: readonly string[],
  prefix: string
): ScopedClass[] =>
  classes.flatMap((raw) => {
    const parsed = parseClass(raw);

    if (parsed.variants !== prefix) {
      return [];
    }

    return [
      {
        key: "",
        negative: parsed.negative,
        raw: parsed.raw,
        utility: parsed.utility,
      },
    ];
  });

const lastWith = (
  scoped: readonly ScopedClass[],
  head: string
): ScopedClass | null => {
  const hit = scoped.findLast((entry) => entry.utility.startsWith(head));

  if (!hit) {
    return null;
  }

  return { ...hit, key: hit.utility.slice(head.length) };
};

const sideOf = (
  scoped: readonly ScopedClass[],
  side: StackingSide,
  theme: TailwindTheme | null
): StackingValue => {
  let found: ScopedClass | null = null;

  for (const head of SIDE_SOURCES[side]) {
    const hit = lastWith(scoped, head);

    if (hit !== null && !(head === "inset-" && /^[xy]-/u.test(hit.key))) {
      found = hit;
    }
  }

  if (found === null) {
    return UNSET;
  }

  return insetValueOf(found.raw, found.key, found.negative, theme);
};

const overflowOf = (
  scoped: readonly ScopedClass[],
  axis: Axis
): StackingValue => {
  const words = [...OVERFLOW].join("|");
  const pattern = new RegExp(`^overflow-(?:${axis}-)?(${words})$`, "u");
  const hit = scoped.findLast((entry) => pattern.test(entry.utility));

  if (!hit) {
    return UNSET;
  }

  const word = hit.utility.split("-").at(-1) ?? "";

  return keywordValueOf(hit.raw, word);
};

const positionOf = (scoped: readonly ScopedClass[]): StackingValue => {
  const hit = scoped.findLast((entry) => POSITION.has(entry.utility));

  if (!hit) {
    return UNSET;
  }

  return keywordValueOf(hit.raw, hit.utility);
};

const zIndexOf = (scoped: readonly ScopedClass[]): StackingValue => {
  const hit = lastWith(scoped, "z-");

  if (hit === null) {
    return UNSET;
  }

  return zValueOf(hit.raw, hit.key, hit.negative);
};

const classStackingOf = (
  classes: readonly string[],
  prefix: string,
  theme: TailwindTheme | null
): StackingValues => {
  const scoped = scopedClassesOf(classes, prefix);

  return {
    inset: {
      bottom: sideOf(scoped, "bottom", theme),
      left: sideOf(scoped, "left", theme),
      right: sideOf(scoped, "right", theme),
      top: sideOf(scoped, "top", theme),
    },
    overflowX: overflowOf(scoped, "x"),
    overflowY: overflowOf(scoped, "y"),
    position: positionOf(scoped),
    zIndex: zIndexOf(scoped),
  };
};

const declared = (
  decls: readonly CssDeclaration[],
  prop: string
): string | null =>
  decls.findLast((entry) => entry.prop === prop)?.value ?? null;

const cssOrUnset = (value: string | null): StackingValue => {
  if (value === null) {
    return UNSET;
  }

  return cssValueOf(value);
};

const cssOverflowOf = (
  decls: readonly CssDeclaration[],
  axis: Axis
): StackingValue => {
  const own = declared(decls, `overflow-${axis}`);

  if (own !== null) {
    return cssValueOf(own);
  }

  const both = declared(decls, "overflow");

  if (both === null) {
    return UNSET;
  }

  const parts = both.trim().split(/\s+/u);

  if (axis === "y") {
    return cssValueOf(parts[1] ?? parts[0] ?? both);
  }

  return cssValueOf(parts[0] ?? both);
};

const cssStackingOf = (decls: readonly CssDeclaration[]): StackingValues => ({
  inset: {
    bottom: cssOrUnset(declared(decls, "bottom")),
    left: cssOrUnset(declared(decls, "left")),
    right: cssOrUnset(declared(decls, "right")),
    top: cssOrUnset(declared(decls, "top")),
  },
  overflowX: cssOverflowOf(decls, "x"),
  overflowY: cssOverflowOf(decls, "y"),
  position: cssOrUnset(declared(decls, "position")),
  zIndex: cssOrUnset(declared(decls, "z-index")),
});

const emptyStacking = (): StackingValues => cssStackingOf([]);

export { classStackingOf, cssStackingOf, emptyStacking, scopedClassesOf };

export type { CssDeclaration, ScopedClass };
