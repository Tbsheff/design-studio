import type { ScopeResult } from "./breakpoint-scope.js";
import { prefixOf } from "./breakpoint-scope.js";
import {
  BREAKPOINT_BASE,
  classify,
  classProps,
  parseClass,
  parseVariant,
  STYLE_STATES,
} from "./deps.js";
import type {
  BreakpointEntry,
  StateOverride,
  StyleState,
  TailwindTheme,
} from "./deps.js";
import type { CssDeclaration } from "./scoped-style.js";
import { scopesOf } from "./scoped-style.js";

interface StateScope {
  readonly breakpoint: string;
  readonly prefix: string;
  readonly state: StyleState;
}

const statePrefixOf = (
  list: readonly BreakpointEntry[],
  state: StyleState,
  breakpoint: string
): ScopeResult<string> => {
  const scope = prefixOf(list, breakpoint);

  if (!scope.ok) {
    return scope;
  }

  return { ok: true, value: `${scope.value}${state}:` };
};

const stateScopesOf = (list: readonly BreakpointEntry[]): StateScope[] =>
  STYLE_STATES.flatMap((state) =>
    scopesOf(list).map((scope) => ({
      breakpoint: scope.breakpoint,
      prefix: `${scope.prefix}${state}:`,
      state,
    }))
  );

const statesOfVariant = (variants: string): StyleState[] => {
  const parsed = parseVariant(variants);

  if (parsed === null) {
    return [];
  }

  const found: StyleState[] = parsed.states.filter(
    (state): state is StyleState =>
      (STYLE_STATES as readonly string[]).includes(state)
  );

  if (parsed.dark) {
    found.push("dark");
  }

  return found;
};

const breakpointOfVariant = (variants: string): string =>
  parseVariant(variants)?.breakpoint ?? BREAKPOINT_BASE;

const propsOfClass = (token: string, theme: TailwindTheme): string[] => {
  const parsed = classify(parseClass(token), theme);

  if (!parsed) {
    return [];
  }

  return classProps(parsed);
};

const keyOf = (state: StyleState, variants: string): string =>
  `${state}\u0000${variants}`;

const addClass = (
  groups: Map<string, { scope: StateScope; tokens: string[] }>,
  token: string
): void => {
  const { variants } = parseClass(token);

  for (const state of statesOfVariant(variants)) {
    const key = keyOf(state, variants);

    const group = groups.get(key) ?? {
      scope: {
        breakpoint: breakpointOfVariant(variants),
        prefix: variants,
        state,
      },
      tokens: [],
    };

    group.tokens.push(token);
    groups.set(key, group);
  }
};

const stateClassOverridesOf = (
  classes: readonly string[],
  theme: TailwindTheme
): StateOverride[] => {
  const groups = new Map<string, { scope: StateScope; tokens: string[] }>();

  for (const token of classes) {
    addClass(groups, token);
  }

  return [...groups.values()].map((group) => ({
    breakpoint: group.scope.breakpoint,
    prefix: group.scope.prefix,
    props: [
      ...new Set(group.tokens.flatMap((token) => propsOfClass(token, theme))),
    ],
    set: group.tokens,
    state: group.scope.state,
  }));
};

const stateCssOverridesOf = (
  list: readonly BreakpointEntry[],
  read: (prefix: string) => readonly CssDeclaration[]
): StateOverride[] => {
  const out: StateOverride[] = [];

  for (const scope of stateScopesOf(list)) {
    const decls = read(scope.prefix);

    if (decls.length > 0) {
      out.push({
        breakpoint: scope.breakpoint,
        prefix: scope.prefix,
        props: decls.map((entry) => entry.prop),
        set: decls.map((entry) => `${entry.prop}: ${entry.value}`),
        state: scope.state,
      });
    }
  }

  return out;
};

export {
  stateClassOverridesOf,
  stateCssOverridesOf,
  statePrefixOf,
  stateScopesOf,
};

export type { StateScope };
