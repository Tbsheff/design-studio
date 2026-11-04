import type { ScopeResult } from "./breakpoint-scope.js";
import { BREAKPOINT_BASE, classify, classProps, parseClass } from "./deps.js";
import type {
  BreakpointEntry,
  BreakpointOverride,
  BreakpointStyleInput,
  TailwindTheme,
} from "./deps.js";

interface CssDeclaration {
  readonly prop: string;
  readonly value: string;
}

interface ScopeEntry {
  readonly breakpoint: string;
  readonly prefix: string;
  readonly px: number | null;
}

const NEEDS_VALUE = "Pass value, or reset: true to remove the override.";

const scopedStyleOf = (
  input: BreakpointStyleInput
): ScopeResult<Record<string, string | null>> => {
  if (input.reset) {
    return { ok: true, value: { [input.property]: null } };
  }

  if (input.value === null || input.value.trim() === "") {
    return { code: NEEDS_VALUE, ok: false };
  }

  return { ok: true, value: { [input.property]: input.value.trim() } };
};

const scopesOf = (list: readonly BreakpointEntry[]): ScopeEntry[] => [
  { breakpoint: BREAKPOINT_BASE, prefix: "", px: null },
  ...list.map((entry) => ({
    breakpoint: entry.name,
    prefix: `${entry.name}:`,
    px: entry.px,
  })),
];

const propsOfClass = (token: string, theme: TailwindTheme): string[] => {
  const parsed = classify(parseClass(token), theme);

  if (!parsed) {
    return [];
  }

  return classProps(parsed);
};

const classOverrideOf = (
  scope: ScopeEntry,
  classes: readonly string[],
  theme: TailwindTheme
): BreakpointOverride => {
  const matched = classes.filter(
    (token) => parseClass(token).variants === scope.prefix
  );

  return {
    breakpoint: scope.breakpoint,
    prefix: scope.prefix,
    props: [...new Set(matched.flatMap((token) => propsOfClass(token, theme)))],
    px: scope.px,
    set: matched,
  };
};

const classOverridesOf = (
  classes: readonly string[],
  theme: TailwindTheme,
  list: readonly BreakpointEntry[]
): BreakpointOverride[] => {
  const out: BreakpointOverride[] = [];

  for (const scope of scopesOf(list)) {
    const entry = classOverrideOf(scope, classes, theme);

    if (entry.set.length > 0 || entry.prefix === "") {
      out.push(entry);
    }
  }

  return out;
};

const cssOverridesOf = (
  list: readonly BreakpointEntry[],
  read: (prefix: string) => readonly CssDeclaration[]
): BreakpointOverride[] => {
  const out: BreakpointOverride[] = [];

  for (const scope of scopesOf(list).slice(1)) {
    const decls = read(scope.prefix);

    if (decls.length > 0) {
      out.push({
        breakpoint: scope.breakpoint,
        prefix: scope.prefix,
        props: decls.map((entry) => entry.prop),
        px: scope.px,
        set: decls.map((entry) => `${entry.prop}: ${entry.value}`),
      });
    }
  }

  return out;
};

export { classOverridesOf, cssOverridesOf, scopedStyleOf, scopesOf };

export type { CssDeclaration, ScopeEntry };
