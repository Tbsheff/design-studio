import type { ChangedLayer } from "@design-studio/actions/version/changes/schema";

import type { PatchHunk } from "../../../shared/hunk.js";
import type { ElementSpan } from "./to-changed-layers.js";

interface StyleBlock {
  readonly endLine: number;
  readonly startLine: number;
  readonly text: string;
}

interface ElementKey {
  readonly classes: ReadonlySet<string>;
  readonly id: string | null;
  readonly tag: string;
}

interface StyledElement {
  readonly key: ElementKey;
  readonly parents: readonly ElementKey[];
  readonly span: ElementSpan;
}

interface StyleChange {
  readonly blocks: readonly StyleBlock[];
  readonly elements: readonly StyledElement[];
  readonly file: string;
  readonly hunks: readonly PatchHunk[];
}

interface CssRule {
  readonly endLine: number;
  readonly selector: string;
  readonly startLine: number;
}

interface Compound {
  readonly classes: readonly string[];
  readonly id: string | null;
  readonly tag: string | null;
}

interface SelectorPart {
  readonly compound: Compound;
  readonly isChild: boolean;
}

interface MatchCursor {
  readonly isChild: boolean;
  readonly parentIndex: number;
  readonly partIndex: number;
}

interface ScanState {
  readonly rules: CssRule[];
  readonly stack: { readonly line: number; readonly selector: string }[];
  line: number;
  selectorLine: number;
  text: string;
}

const OPEN = "{";

const CLOSE = "}";

const NEW_LINE = "\n";

const SKIP_GROUP =
  /^@(?:font-face|keyframes|-webkit-keyframes|page|property)/iu;

const UNSUPPORTED = /[[\]*+~]|::?(?:not|is|where|has)\(/iu;

const PSEUDO = /::?[\w-]+(?:\([^)]*\))?/gu;

const NAME_PART = /(?<sign>[.#]?)(?<name>-?[_a-zA-Z][\w-]*)/gu;

const COMMENT = /\/\*[\s\S]*?\*\//gu;

const EMPTY_KEY: ElementKey = { classes: new Set(), id: null, tag: "" };

const toLineCount = (text: string): number => text.split(NEW_LINE).length - 1;

const toOpenRule = (state: ScanState): void => {
  state.stack.push({
    line: state.selectorLine,
    selector: state.text.trim(),
  });
  state.text = "";
};

const toCloseRule = (state: ScanState): void => {
  const open = state.stack.pop();
  state.text = "";

  if (!open || open.selector.startsWith("@")) {
    return;
  }

  const isSkipped = state.stack.some((entry) =>
    SKIP_GROUP.test(entry.selector)
  );

  if (!isSkipped) {
    state.rules.push({
      endLine: state.line,
      selector: open.selector,
      startLine: open.line,
    });
  }
};

const toCssRules = (block: StyleBlock): readonly CssRule[] => {
  const state: ScanState = {
    line: block.startLine,
    rules: [],
    selectorLine: block.startLine,
    stack: [],
    text: "",
  };

  const clean = block.text.replaceAll(COMMENT, (found) =>
    NEW_LINE.repeat(toLineCount(found))
  );

  for (const char of clean) {
    if (char === OPEN) {
      toOpenRule(state);
    } else if (char === CLOSE) {
      toCloseRule(state);
    } else if (char === ";") {
      state.text = "";
    } else {
      if (state.text.trim() === "" && char.trim() !== "") {
        state.selectorLine = state.line;
      }

      state.text = `${state.text}${char}`;
    }

    if (char === NEW_LINE) {
      state.line += 1;
    }
  }

  return state.rules;
};

const toChangedLines = (hunk: PatchHunk): readonly number[] => {
  const lines: number[] = [];
  let newLine = hunk.newStart;

  for (const line of hunk.lines) {
    if (line.sign === "-") {
      lines.push(newLine);
    } else {
      if (line.sign === "+") {
        lines.push(newLine);
      }

      newLine += 1;
    }
  }

  return lines;
};

const toCompound = (text: string): Compound | null => {
  const bare = text.replaceAll(PSEUDO, "");
  const classes: string[] = [];
  let id: string | null = null;
  let tag: string | null = null;

  for (const match of bare.matchAll(NAME_PART)) {
    const sign = match.groups?.["sign"] ?? "";
    const name = match.groups?.["name"] ?? "";

    if (sign === ".") {
      classes.push(name);
    } else if (sign === "#") {
      id = name;
    } else {
      tag = name.toLowerCase();
    }
  }

  if (tag === null && id === null && classes.length === 0) {
    return null;
  }

  return { classes, id, tag };
};

const toSelectorParts = (selector: string): readonly SelectorPart[] | null => {
  if (UNSUPPORTED.test(selector)) {
    return null;
  }

  const tokens = selector
    .replaceAll(">", " > ")
    .split(/\s+/u)
    .filter((token) => token !== "");

  const parts: SelectorPart[] = [];
  let isChild = false;

  for (const token of tokens) {
    const compound = toCompound(token);

    if (token === ">") {
      isChild = true;
    } else if (compound === null) {
      return null;
    } else {
      parts.push({ compound, isChild });
      isChild = false;
    }
  }

  if (parts.length === 0) {
    return null;
  }

  return parts;
};

const isTagMatch = (compound: Compound, key: ElementKey): boolean =>
  compound.tag === null || compound.tag === key.tag;

const isIdMatch = (compound: Compound, key: ElementKey): boolean =>
  compound.id === null || compound.id === key.id;

const isCompoundMatch = (compound: Compound, key: ElementKey): boolean =>
  isTagMatch(compound, key) &&
  isIdMatch(compound, key) &&
  compound.classes.every((name) => key.classes.has(name));

const isAncestorMatch = (
  parts: readonly SelectorPart[],
  parents: readonly ElementKey[],
  cursor: MatchCursor
): boolean => {
  const part = parts[cursor.partIndex];

  if (!part) {
    return true;
  }

  for (let index = cursor.parentIndex; index >= 0; index -= 1) {
    const parent = parents[index];

    const isHit =
      Boolean(parent) &&
      isCompoundMatch(part.compound, parent ?? EMPTY_KEY) &&
      isAncestorMatch(parts, parents, {
        isChild: part.isChild,
        parentIndex: index - 1,
        partIndex: cursor.partIndex - 1,
      });

    if (isHit) {
      return true;
    }

    if (cursor.isChild) {
      return false;
    }
  }

  return false;
};

const isSelectorMatch = (
  parts: readonly SelectorPart[],
  element: StyledElement
): boolean => {
  const last = parts.at(-1);

  if (!last || !isCompoundMatch(last.compound, element.key)) {
    return false;
  }

  return isAncestorMatch(parts, element.parents, {
    isChild: last.isChild,
    parentIndex: element.parents.length - 1,
    partIndex: parts.length - 2,
  });
};

const toSelectorList = (selector: string): readonly string[] =>
  selector
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "");

const toElementHits = (
  parts: readonly SelectorPart[],
  elements: readonly StyledElement[]
): readonly ElementSpan[] => {
  const hits: ElementSpan[] = [];

  for (const element of elements) {
    if (isSelectorMatch(parts, element)) {
      hits.push(element.span);
    }
  }

  return hits;
};

const toRuleHits = (
  change: StyleChange,
  rule: CssRule
): readonly ElementSpan[] =>
  toSelectorList(rule.selector).flatMap((selector) => {
    const parts = toSelectorParts(selector);

    if (parts === null) {
      return [];
    }

    return toElementHits(parts, change.elements);
  });

const toInnerRule = (
  rules: readonly CssRule[],
  line: number
): CssRule | null => {
  let found: CssRule | null = null;

  for (const rule of rules) {
    const isInside = rule.startLine <= line && line <= rule.endLine;

    const isSmaller =
      found === null ||
      rule.endLine - rule.startLine < found.endLine - found.startLine;

    if (isInside && isSmaller) {
      found = rule;
    }
  }

  return found;
};

const toLayer = (
  change: StyleChange,
  span: ElementSpan,
  hunkIndex: number
): ChangedLayer => ({
  file: change.file,
  hunk: hunkIndex,
  kind: "style",
  layerId: span.loc,
  line: span.start.line,
  tag: span.tag,
});

const toHunkRules = (
  rules: readonly CssRule[],
  hunk: PatchHunk
): ReadonlySet<CssRule> => {
  const found = new Set<CssRule>();

  for (const line of toChangedLines(hunk)) {
    const rule = toInnerRule(rules, line);

    if (rule !== null) {
      found.add(rule);
    }
  }

  return found;
};

const toStyleLayers = (change: StyleChange): readonly ChangedLayer[] => {
  const byLayer = new Map<string, ChangedLayer>();
  const rules = change.blocks.flatMap(toCssRules);

  for (const hunk of change.hunks) {
    const spans = [...toHunkRules(rules, hunk)].flatMap((rule) =>
      toRuleHits(change, rule)
    );

    for (const span of spans) {
      if (!byLayer.has(span.loc)) {
        byLayer.set(span.loc, toLayer(change, span, hunk.index));
      }
    }
  }

  return [...byLayer.values()];
};

export { toStyleLayers };

export type { ElementKey, StyleBlock, StyleChange, StyledElement };
