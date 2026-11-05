import { parseClass } from "./deps.js";

interface ScopedClass {
  readonly raw: string;
  readonly utility: string;
}

interface CssDeclaration {
  readonly prop: string;
  readonly value: string;
}

const toScopedClasses = (
  classes: readonly string[],
  prefix: string
): ScopedClass[] =>
  classes.flatMap((raw) => {
    const parsed = parseClass(raw);

    if (parsed.variants !== prefix || parsed.negative) {
      return [];
    }

    return [{ raw: parsed.raw, utility: parsed.utility }];
  });

const toLastClass = (
  scoped: readonly ScopedClass[],
  test: (utility: string) => boolean
): ScopedClass | null =>
  scoped.findLast((entry) => test(entry.utility)) ?? null;

const toDeclared = (
  decls: readonly CssDeclaration[],
  prop: string
): string | null =>
  decls.findLast((entry) => entry.prop === prop)?.value ?? null;

export { toDeclared, toLastClass, toScopedClasses };

export type { CssDeclaration, ScopedClass };
