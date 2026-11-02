import type { CapturedNode } from "./captured.js";
import { COLOR_SNAP_DELTA, matchColor, matchFontFamily } from "./deps.js";
import type { CompiledTokenEntry } from "./deps.js";
import { elementChildren } from "./nodes.js";

const COLOR_PROPS = new Set([
  "color",
  "background-color",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "fill",
  "stroke",
]);

const UNSAFE_CSS = /[<>{};]/gu;

interface ClassSheet {
  readonly classOf: ReadonlyMap<CapturedNode, string>;
  readonly rules: readonly string[];
  readonly tokens: number;
}

interface SheetState {
  readonly byKey: Map<string, string>;
  readonly classOf: Map<CapturedNode, string>;
  readonly entries: CompiledTokenEntry[];
  readonly rules: string[];
  readonly tokenCache: Map<string, string | null>;
  tokens: number;
}

const colorToken = (
  value: string,
  entries: CompiledTokenEntry[]
): string | null => {
  const [match] = matchColor(value, entries);

  if (match && match.distance < COLOR_SNAP_DELTA) {
    return `var(${match.cssVar})`;
  }

  return null;
};

const fontToken = (
  value: string,
  entries: CompiledTokenEntry[]
): string | null => {
  const [match] = matchFontFamily(value, entries);

  if (match?.exact) {
    return `var(${match.cssVar})`;
  }

  return null;
};

const tokenFor = (
  name: string,
  value: string,
  entries: CompiledTokenEntry[]
): string | null => {
  if (COLOR_PROPS.has(name)) {
    return colorToken(value, entries);
  }

  if (name === "font-family") {
    return fontToken(value, entries);
  }

  return null;
};

const mappedValue = (
  state: SheetState,
  name: string,
  value: string
): string => {
  const key = `${name}:${value}`;

  if (!state.tokenCache.has(key)) {
    state.tokenCache.set(key, tokenFor(name, value, state.entries));
  }

  const token = state.tokenCache.get(key) ?? null;

  if (token === null) {
    return value;
  }

  state.tokens += 1;

  return token;
};

const declarationsOf = (
  state: SheetState,
  style: Readonly<Record<string, string>>
): string => {
  const lines: string[] = [];

  for (const name of Object.keys(style).toSorted()) {
    const value = (style[name] ?? "").replaceAll(UNSAFE_CSS, "").trim();

    if (value !== "") {
      lines.push(`${name}:${mappedValue(state, name, value)}`);
    }
  }

  return lines.join(";");
};

const classFor = (state: SheetState, key: string): string => {
  const known = state.byKey.get(key);

  if (known) {
    return known;
  }

  const name = `s${state.byKey.size + 1}`;

  state.byKey.set(key, name);
  state.rules.push(`.${name}{${key}}`);

  return name;
};

const addNode = (state: SheetState, node: CapturedNode): void => {
  const key = declarationsOf(state, node.style ?? {});

  if (key !== "") {
    state.classOf.set(node, classFor(state, key));
  }

  for (const child of elementChildren(node)) {
    addNode(state, child);
  }
};

const buildClassSheet = (
  root: CapturedNode,
  entries: readonly CompiledTokenEntry[]
): ClassSheet => {
  const state: SheetState = {
    byKey: new Map(),
    classOf: new Map(),
    entries: [...entries],
    rules: [],
    tokenCache: new Map(),
    tokens: 0,
  };

  addNode(state, root);

  return { classOf: state.classOf, rules: state.rules, tokens: state.tokens };
};

export { buildClassSheet };

export type { ClassSheet };
