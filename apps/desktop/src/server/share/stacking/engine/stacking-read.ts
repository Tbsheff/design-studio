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

const toScopedClassesOf = (
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

const toLastWith = (
  scoped: readonly ScopedClass[],
  head: string
): ScopedClass | null => {
  const hit = scoped.findLast((entry) => entry.utility.startsWith(head));

  if (!hit) {
    return null;
  }

  return { ...hit, key: hit.utility.slice(head.length) };
};

const toSideOf = (
  scoped: readonly ScopedClass[],
  side: StackingSide,
  theme: TailwindTheme | null
): StackingValue => {
  let found: ScopedClass | null = null;

  for (const head of SIDE_SOURCES[side]) {
    const hit = toLastWith(scoped, head);

    if (hit !== null && !(head === "inset-" && /^[xy]-/u.test(hit.key))) {
      found = hit;
    }
  }

  if (found === null) {
    return UNSET;
  }

  return insetValueOf(found.raw, found.key, found.negative, theme);
};

const toOverflowOf = (
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

const toPositionOf = (scoped: readonly ScopedClass[]): StackingValue => {
  const hit = scoped.findLast((entry) => POSITION.has(entry.utility));

  if (!hit) {
    return UNSET;
  }

  return keywordValueOf(hit.raw, hit.utility);
};

const toZIndexOf = (scoped: readonly ScopedClass[]): StackingValue => {
  const hit = toLastWith(scoped, "z-");

  if (hit === null) {
    return UNSET;
  }

  return zValueOf(hit.raw, hit.key, hit.negative);
};

const toClassStackingOf = (
  classes: readonly string[],
  prefix: string,
  theme: TailwindTheme | null
): StackingValues => {
  const scoped = toScopedClassesOf(classes, prefix);

  return {
    inset: {
      bottom: toSideOf(scoped, "bottom", theme),
      left: toSideOf(scoped, "left", theme),
      right: toSideOf(scoped, "right", theme),
      top: toSideOf(scoped, "top", theme),
    },
    overflowX: toOverflowOf(scoped, "x"),
    overflowY: toOverflowOf(scoped, "y"),
    position: toPositionOf(scoped),
    zIndex: toZIndexOf(scoped),
  };
};

const toDeclared = (
  decls: readonly CssDeclaration[],
  prop: string
): string | null =>
  decls.findLast((entry) => entry.prop === prop)?.value ?? null;

const toCssOrUnset = (value: string | null): StackingValue => {
  if (value === null) {
    return UNSET;
  }

  return cssValueOf(value);
};

const toCssOverflowOf = (
  decls: readonly CssDeclaration[],
  axis: Axis
): StackingValue => {
  const own = toDeclared(decls, `overflow-${axis}`);

  if (own !== null) {
    return cssValueOf(own);
  }

  const both = toDeclared(decls, "overflow");

  if (both === null) {
    return UNSET;
  }

  const parts = both.trim().split(/\s+/u);

  if (axis === "y") {
    return cssValueOf(parts[1] ?? parts[0] ?? both);
  }

  return cssValueOf(parts[0] ?? both);
};

const toCssStackingOf = (decls: readonly CssDeclaration[]): StackingValues => ({
  inset: {
    bottom: toCssOrUnset(toDeclared(decls, "bottom")),
    left: toCssOrUnset(toDeclared(decls, "left")),
    right: toCssOrUnset(toDeclared(decls, "right")),
    top: toCssOrUnset(toDeclared(decls, "top")),
  },
  overflowX: toCssOverflowOf(decls, "x"),
  overflowY: toCssOverflowOf(decls, "y"),
  position: toCssOrUnset(toDeclared(decls, "position")),
  zIndex: toCssOrUnset(toDeclared(decls, "z-index")),
});

const toEmptyStacking = (): StackingValues => toCssStackingOf([]);

export {
  toClassStackingOf as classStackingOf,
  toCssStackingOf as cssStackingOf,
  toEmptyStacking as emptyStacking,
  toScopedClassesOf as scopedClassesOf,
};

export type { CssDeclaration, ScopedClass };
