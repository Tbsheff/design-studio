import type { CompiledTokenEntry, TokenType } from "@design-studio/contracts";

import { tokenGroup } from "../app-tokens/tokens.js";
import { isValidLiteral } from "../token-literal.js";
import { resolveVars } from "./css.js";
import { requiredPaths } from "./names.js";
import type { Harvest } from "./types.js";

type ThemeMode = "light" | "dark";

type SourceVars = NonNullable<Harvest["sourceVars"]>;

type TokenScalar = string | number | boolean | null;

interface TokenTree {
  [key: string]: TokenScalar | TokenTree | readonly TokenScalar[];
}

interface TokenSlot {
  readonly path: string;
  readonly type: TokenType;
}

interface TokenValue {
  readonly type: TokenType;
  readonly value: string;
}

interface ModeValues {
  readonly dark: TokenValue | null;
  readonly light: TokenValue;
}

interface SourceVarInput {
  readonly appVars: ReadonlyMap<string, string>;
  readonly entries: readonly CompiledTokenEntry[];
  readonly mode: ThemeMode;
  readonly tokens: TokenTree;
  readonly vars: SourceVars;
}

interface SourceVarState {
  readonly darkScopes: Map<string, string>[];
  readonly done: Set<string>;
  readonly input: SourceVarInput;
  readonly lightScopes: Map<string, string>[];
  readonly required: ReadonlySet<string>;
  readonly skipped: string[];
  readonly slots: Map<string, TokenSlot>;
  readonly types: ReadonlyMap<string, TokenType>;
}

interface RawRead {
  readonly isDark: boolean;
  readonly name: string;
  readonly raw: string;
  readonly wanted: TokenType | null;
}

interface SourceVarResult {
  readonly kept: readonly string[];
  readonly skipped: readonly string[];
}

const WHOLE_VAR = /^var\(\s*(?<ref>--[\w-]+)\s*\)$/u;

const MODES_EXTENSION = "studio.modes";

const isTree = (value: TokenTree[string] | undefined): value is TokenTree =>
  value instanceof Object && !Array.isArray(value);

const isSourceName = (vars: SourceVars, name: string): boolean =>
  vars.root.has(name) || vars.dark.has(name);

const toNodeAt = (tokens: TokenTree, path: string): TokenTree | null => {
  let node: TokenTree | null = tokens;

  for (const segment of path.split(".")) {
    const child: TokenTree[string] | undefined = node?.[segment];
    node = null;

    if (isTree(child)) {
      node = child;
    }
  }

  return node;
};

const hasDarkValue = (tokens: TokenTree, path: string): boolean => {
  const extensions = toNodeAt(tokens, path)?.$extensions;

  return isTree(extensions) && isTree(extensions[MODES_EXTENSION]);
};

const hasSelfReference = (name: string, raw: string): boolean =>
  new RegExp(`var\\(\\s*${name}\\s*[,)]`, "u").test(raw);

const toRefOf = (raw: string | undefined): string | null =>
  WHOLE_VAR.exec(raw ?? "")?.groups?.ref ?? null;

const toScopes = (
  state: SourceVarState,
  isDark: boolean
): Map<string, string>[] => {
  if (isDark) {
    return state.darkScopes;
  }

  return state.lightScopes;
};

const toAliasValue = (
  state: SourceVarState,
  read: RawRead
): TokenValue | null => {
  const ref = toRefOf(read.raw);

  if (
    ref === null ||
    (isSourceName(state.input.vars, ref) && !state.done.has(ref))
  ) {
    return null;
  }

  const target = state.slots.get(ref) ?? null;

  if (
    target === null ||
    (read.wanted !== null && read.wanted !== target.type)
  ) {
    return null;
  }

  return { type: target.type, value: `{${target.path}}` };
};

const toValue = (state: SourceVarState, read: RawRead): TokenValue | null => {
  if (hasSelfReference(read.name, read.raw)) {
    return null;
  }

  const alias = toAliasValue(state, read);

  if (alias !== null) {
    return alias;
  }

  const resolved = resolveVars(read.raw, toScopes(state, read.isDark));
  const type = read.wanted ?? tokenGroup(read.name, resolved).type;

  const literal =
    [read.raw, resolved].find((value) => isValidLiteral(type, value)) ?? null;

  if (literal !== null) {
    return { type, value: literal };
  }

  if (read.wanted === null && isValidLiteral("other", read.raw)) {
    return { type: "other", value: read.raw };
  }

  return null;
};

const toMappedValue = (
  state: SourceVarState,
  name: string,
  darkRaw: string | null
): TokenValue | null => {
  const corePath = state.input.appVars.get(name) ?? null;

  if (corePath === null) {
    return null;
  }

  const type = state.types.get(corePath) ?? null;

  if (
    type === null ||
    (darkRaw === null && hasDarkValue(state.input.tokens, corePath))
  ) {
    return null;
  }

  return { type, value: `{${corePath}}` };
};

const toRawValues = (lightRaw: string, darkRaw: string): ModeValues | null => {
  if (!isValidLiteral("other", lightRaw) || !isValidLiteral("other", darkRaw)) {
    return null;
  }

  return {
    dark: { type: "other", value: darkRaw },
    light: { type: "other", value: lightRaw },
  };
};

const toModeValues = (
  state: SourceVarState,
  name: string
): ModeValues | null => {
  const rootRaw = state.input.vars.root.get(name) ?? null;
  const darkRaw = state.input.vars.dark.get(name) ?? null;
  const mapped = toMappedValue(state, name, darkRaw);

  if (mapped !== null) {
    return { dark: null, light: mapped };
  }

  const lightRaw = rootRaw ?? darkRaw ?? "";
  const isDark = rootRaw === null;
  const read: RawRead = { isDark, name, raw: lightRaw, wanted: null };
  const light = toValue(state, read);

  if (light === null) {
    return null;
  }

  if (rootRaw === null || darkRaw === null || rootRaw === darkRaw) {
    return { dark: null, light };
  }

  const dark = toValue(state, {
    ...read,
    isDark: true,
    raw: darkRaw,
    wanted: light.type,
  });

  if (dark === null) {
    return toRawValues(lightRaw, darkRaw);
  }

  return { dark, light };
};

const isFreeAt = (tokens: TokenTree, group: string, key: string): boolean => {
  if (!Object.hasOwn(tokens, group)) {
    return true;
  }

  const node = tokens[group];

  return isTree(node) && !Object.hasOwn(node, key);
};

const toFreePath = (
  tokens: TokenTree,
  name: string,
  type: TokenType
): string | null => {
  const bare = name.slice(2);
  const split = bare.indexOf("-");
  const group = bare.slice(0, Math.max(split, 0));
  const key = bare.slice(split + 1);

  const isGroupName =
    type !== "color" && group !== "" && group !== "color" && key !== "";

  if (isGroupName && isFreeAt(tokens, group, key)) {
    return `${group}.${key}`;
  }

  if (isFreeAt(tokens, "color", bare)) {
    return `color.${bare}`;
  }

  return null;
};

const toParentAt = (tokens: TokenTree, segments: string[]): TokenTree => {
  let parent = tokens;

  for (const segment of segments) {
    const child = parent[segment];
    let next: TokenTree = {};

    if (isTree(child)) {
      next = child;
    }

    parent[segment] = next;
    parent = next;
  }

  return parent;
};

const toExtensions = (
  previous: TokenTree[string] | undefined,
  dark: TokenValue | null
): Record<string, TokenTree[string]> => {
  let entries: [string, TokenTree[string]][] = [];

  if (isTree(previous)) {
    entries = Object.entries(previous);
  }

  const kept = entries.filter(([key]) => key !== MODES_EXTENSION);

  const extensions = Object.fromEntries(kept);

  if (dark !== null) {
    extensions[MODES_EXTENSION] = { dark: dark.value };
  }

  return extensions;
};

const toDarkValue = (
  state: SourceVarState,
  values: ModeValues
): TokenValue | null => {
  if (state.input.mode === "dark") {
    return null;
  }

  return values.dark;
};

const toPackValue = (state: SourceVarState, values: ModeValues): string => {
  if (state.input.mode === "dark" && values.dark !== null) {
    return values.dark.value;
  }

  return values.light.value;
};

const setTokenNode = (
  state: SourceVarState,
  path: string,
  name: string,
  values: ModeValues
): void => {
  const segments = path.split(".");
  const parent = toParentAt(state.input.tokens, segments.slice(0, -1));
  const key = segments.at(-1) ?? "";
  const previous = toNodeAt(parent, key)?.$extensions;

  const extensions = toExtensions(previous, toDarkValue(state, values));

  const fields = {
    $description: `From ${state.input.vars.label}: ${name}`,
    $type: values.light.type,
    $value: toPackValue(state, values),
  };

  parent[key] = fields;

  if (Object.keys(extensions).length > 0) {
    parent[key] = { ...fields, $extensions: extensions };
  }
};

const setSourceVar = (state: SourceVarState, name: string): void => {
  const existing = state.slots.get(name) ?? null;

  if (existing !== null && state.required.has(existing.path)) {
    return;
  }

  const values = toModeValues(state, name);

  if (values === null) {
    state.skipped.push(name);

    return;
  }

  if (existing !== null && existing.type !== values.light.type) {
    return;
  }

  const path =
    existing?.path ?? toFreePath(state.input.tokens, name, values.light.type);

  if (path === null) {
    state.skipped.push(name);

    return;
  }

  setTokenNode(state, path, name, values);
  state.slots.set(name, { path, type: values.light.type });
};

const toOrder = (vars: SourceVars): string[] => {
  const order: string[] = [];
  const seen = new Set<string>();

  const visit = (name: string): void => {
    if (seen.has(name) || !isSourceName(vars, name)) {
      return;
    }

    seen.add(name);

    for (const raw of [vars.root.get(name), vars.dark.get(name)]) {
      const ref = toRefOf(raw);

      if (ref !== null) {
        visit(ref);
      }
    }

    order.push(name);
  };

  for (const name of new Set([...vars.root.keys(), ...vars.dark.keys()])) {
    visit(name);
  }

  return order;
};

const toSourceVarState = (source: SourceVarInput): SourceVarState => {
  const root = new Map(source.vars.root);
  const dark = new Map(source.vars.dark);

  const slotMap = new Map(
    source.entries.map((entry) => [
      entry.cssVar,
      { path: entry.path, type: entry.type },
    ])
  );

  return {
    darkScopes: [dark, root],
    done: new Set(),
    input: source,
    lightScopes: [root, dark],
    required: new Set(requiredPaths()),
    skipped: [],
    slots: slotMap,
    types: new Map(source.entries.map((entry) => [entry.path, entry.type])),
  };
};

const applySourceVars = (input: SourceVarInput): SourceVarResult => {
  const state = toSourceVarState(input);
  const order = toOrder(input.vars);

  for (const name of order) {
    setSourceVar(state, name);
    state.done.add(name);
  }

  return {
    kept: order.filter((name) => state.slots.has(name)),
    skipped: state.skipped,
  };
};

export { applySourceVars };

export type { SourceVarInput, SourceVarResult, TokenTree };
