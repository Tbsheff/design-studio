import type { ScopeResult } from "./breakpoint-scope.js";
import { prefixOf } from "./breakpoint-scope.js";
import {
  BREAKPOINT_BASE,
  classify,
  classProps,
  parseClass,
  parseVariant,
  STYLE_STATES,
  isAriaStateName,
  isDataStateStyle,
  isGroupStateName,
  isOtherStatePart,
  toAriaStateVariant,
  toDataStateVariant,
  toGroupVariant,
  toStyleStateName,
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

const toStatePart = (
  state: StyleState,
  isItem: boolean,
  group: string | null
): string => {
  if (isGroupStateName(state)) {
    return toGroupVariant(state, group);
  }

  if (state === "selected" && isItem) {
    return toDataStateVariant("selected-item");
  }

  if (state === "disabled" && isItem) {
    return toDataStateVariant("disabled-item");
  }

  if (isDataStateStyle(state)) {
    return toDataStateVariant(state);
  }

  if (isAriaStateName(state)) {
    return toAriaStateVariant(state);
  }

  return state;
};

const toStateParts = (state: StyleState): string[] => {
  if (isGroupStateName(state)) {
    return [];
  }

  if (state === "selected" || state === "disabled") {
    return [toStatePart(state, false, null), toStatePart(state, true, null)];
  }

  return [toStatePart(state, false, null)];
};

const SELECTED_ITEM = /(?:^|:)data-\[state=selected\]:/u;

const DISABLED_ITEM = /(?:^|:)data-\[disabled\]:/u;

const hasItemPart = (
  classes: readonly string[],
  state: StyleState
): boolean => {
  if (state !== "selected" && state !== "disabled") {
    return false;
  }

  let pattern = SELECTED_ITEM;

  if (state === "disabled") {
    pattern = DISABLED_ITEM;
  }

  return classes.some((token) => pattern.test(parseClass(token).variants));
};

const toOtherStateParts = (classes: readonly string[]): string[] => {
  const found = new Set<string>();

  for (const token of classes) {
    for (const part of parseClass(token).variants.split(":")) {
      if (isOtherStatePart(part)) {
        found.add(part);
      }
    }
  }

  return [...found].toSorted();
};

const statePrefixOf = (
  list: readonly BreakpointEntry[],
  part: string,
  breakpoint: string
): ScopeResult<string> => {
  const scope = prefixOf(list, breakpoint);

  if (!scope.ok) {
    return scope;
  }

  return { ok: true, value: `${scope.value}${part}:` };
};

const stateScopesOf = (list: readonly BreakpointEntry[]): StateScope[] =>
  STYLE_STATES.flatMap((state) =>
    toStateParts(state).flatMap((part) =>
      scopesOf(list).map((scope) => ({
        breakpoint: scope.breakpoint,
        prefix: `${scope.prefix}${part}:`,
        state,
      }))
    )
  );

const statesOfVariant = (variants: string): StyleState[] => {
  const parsed = parseVariant(variants);

  if (parsed === null) {
    return [];
  }

  const found: StyleState[] = parsed.states
    .map((state) => toStyleStateName(state))
    .filter((state): state is StyleState => state !== null);

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
  hasItemPart,
  toOtherStateParts,
  stateClassOverridesOf,
  stateCssOverridesOf,
  statePrefixOf,
  stateScopesOf,
  toStatePart,
};

export type { StateScope };
