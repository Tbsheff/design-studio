import { normalizeVariant, parseClass } from "./deps.js";
import { DividerError } from "./errors.js";

type DividerAxis = "x" | "y";

interface DividerParts {
  readonly axis: DividerAxis | null;
  readonly color: string | null;
  readonly isReverse: boolean;
  readonly token: string | null;
  readonly width: number | null;
}

interface DividerPaint {
  readonly axis: DividerAxis | null;
  readonly color: string | null;
  readonly token: string | null;
  readonly width: number;
}

interface DividerClassChanges {
  readonly add: string[];
  readonly remove: string[];
}

const DIVIDE = "divide-";

const AXIS_CLASS = /^divide-(?<axis>[xy])(?:-(?<width>\d+|\[[^\]]+\]))?$/u;

const REVERSE_CLASS = /^divide-[xy]-reverse$/u;

const STYLE_WORDS = new Set([
  "dashed",
  "dotted",
  "double",
  "hidden",
  "none",
  "solid",
]);

const ARBITRARY = /^\[(?<value>.+)\]$/u;

const ONE_PX = 1;

const isSameVariant = (variants: string, variant: string): boolean =>
  variants === variant || normalizeVariant(variants) === variant;

const toBareAt = (token: string, variant: string): string | null => {
  const parsed = parseClass(token);

  if (!isSameVariant(parsed.variants, variant)) {
    return null;
  }

  return token.slice(parsed.variants.length);
};

const isAxisClass = (bare: string): boolean =>
  AXIS_CLASS.test(bare) || REVERSE_CLASS.test(bare);

const isColorClass = (bare: string): boolean => {
  if (!bare.startsWith(DIVIDE) || isAxisClass(bare)) {
    return false;
  }

  const rest = bare.slice(DIVIDE.length);

  return !STYLE_WORDS.has(rest) && !rest.startsWith("opacity-");
};

const toWidthOf = (raw: string | null): number => {
  if (raw === null) {
    return ONE_PX;
  }

  const arbitrary = ARBITRARY.exec(raw)?.groups?.value ?? null;

  if (arbitrary !== null) {
    return Number(arbitrary.replace("px", "")) || 0;
  }

  return Number(raw);
};

const toBareClasses = (classes: readonly string[], variant: string): string[] =>
  classes.flatMap((token) => {
    const bare = toBareAt(token, variant);

    if (bare === null) {
      return [];
    }

    return [bare];
  });

const toAxisOf = (raw: string): DividerAxis => {
  if (raw === "x") {
    return "x";
  }

  return "y";
};

interface AxisHit {
  readonly axis: DividerAxis;
  readonly width: number;
}

const toAxisHit = (token: string): AxisHit[] => {
  const groups = AXIS_CLASS.exec(token)?.groups ?? null;

  if (groups === null) {
    return [];
  }

  const width = toWidthOf(groups.width ?? null);

  if (width <= 0) {
    return [];
  }

  return [{ axis: toAxisOf(groups.axis ?? ""), width }];
};

const toAxisParts = (
  bare: readonly string[]
): Pick<DividerParts, "axis" | "width"> => {
  const hits = bare.flatMap((token) => toAxisHit(token));
  const hit = hits.find((entry) => entry.axis === "y") ?? hits[0] ?? null;

  if (hit === null) {
    return { axis: null, width: null };
  }

  return hit;
};

const toColorParts = (
  bare: readonly string[],
  colorNames: ReadonlySet<string>
): Pick<DividerParts, "color" | "token"> => {
  const hit = bare.find((token) => isColorClass(token)) ?? null;

  if (hit === null) {
    return { color: null, token: null };
  }

  const rest = hit.slice(DIVIDE.length);
  const arbitrary = ARBITRARY.exec(rest)?.groups?.value ?? null;

  if (arbitrary !== null) {
    return { color: arbitrary.replaceAll("_", " "), token: null };
  }

  const name = rest.split("/")[0] ?? rest;

  if (colorNames.has(name) || colorNames.size === 0) {
    return { color: `var(--color-${name})`, token: rest };
  }

  return { color: null, token: rest };
};

const toDividerParts = (
  classes: readonly string[],
  variant: string,
  colorNames: ReadonlySet<string>
): DividerParts => {
  const bare = toBareClasses(classes, variant);

  return {
    ...toAxisParts(bare),
    ...toColorParts(bare, colorNames),
    isReverse: bare.some((token) => REVERSE_CLASS.test(token)),
  };
};

const toArbitrary = (value: string): string =>
  value.replaceAll(", ", ",").replaceAll(/\s+/gu, "_");

const toAxisClass = (axis: DividerAxis, width: number): string => {
  if (width === ONE_PX) {
    return `divide-${axis}`;
  }

  return `divide-${axis}-${width}`;
};

const toColorClass = (
  paint: DividerPaint,
  colorNames: ReadonlySet<string>
): string | null => {
  if (paint.token !== null) {
    const name = paint.token.split("/")[0] ?? paint.token;

    if (colorNames.size > 0 && !colorNames.has(name)) {
      throw new DividerError(
        `The token ${paint.token} is not a color in this project. Use a color token name such as border or slate-200.`
      );
    }

    return `divide-${paint.token}`;
  }

  if (paint.color !== null) {
    return `divide-[${toArbitrary(paint.color)}]`;
  }

  return null;
};

const isRemovedOnSet = (bare: string, paint: DividerPaint): boolean => {
  if (AXIS_CLASS.test(bare)) {
    return true;
  }

  if (REVERSE_CLASS.test(bare)) {
    return !bare.startsWith(`divide-${paint.axis ?? ""}-`);
  }

  return isColorClass(bare) && (paint.token !== null || paint.color !== null);
};

const isRemoved = (bare: string, paint: DividerPaint): boolean => {
  if (paint.axis === null) {
    return bare.startsWith(DIVIDE);
  }

  return isRemovedOnSet(bare, paint);
};

const toWanted = (
  paint: DividerPaint,
  variant: string,
  colorNames: ReadonlySet<string>
): string[] => {
  if (paint.axis === null) {
    return [];
  }

  const color = toColorClass(paint, colorNames);
  const wanted = [toAxisClass(paint.axis, paint.width)];

  if (color !== null) {
    wanted.push(color);
  }

  return wanted.map((token) => `${variant}${token}`);
};

const toDividerChanges = (
  classes: readonly string[],
  paint: DividerPaint,
  variant: string,
  colorNames: ReadonlySet<string>
): DividerClassChanges => {
  const wanted = toWanted(paint, variant, colorNames);
  const keep = new Set(wanted);
  const have = new Set(classes);

  const remove = classes.filter((token) => {
    const bare = toBareAt(token, variant);

    return bare !== null && !keep.has(token) && isRemoved(bare, paint);
  });

  return { add: wanted.filter((token) => !have.has(token)), remove };
};

export { toDividerChanges, toDividerParts };

export type { DividerAxis, DividerClassChanges, DividerPaint, DividerParts };
