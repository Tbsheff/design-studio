import { TOKEN_GROUP_FOR_PROPERTY } from "@design-studio/contracts";
import type {
  CompiledTokenEntry,
  DirectStyleProperty,
  TokenMatch,
} from "@design-studio/contracts";

import {
  isSnappable,
  isUnsetValue,
  matchForProperty,
  tokensForProperty,
} from "../../../shared/token-match.js";
import type { TokenMode } from "../../../shared/token-match.js";
import { toDeclarations } from "../inspector/index.js";
import type { AuthoredCss, StyleValues } from "../inspector/index.js";

type LintKind = "color" | "size" | "font";

interface LintIssue {
  kind: LintKind;
  props: DirectStyleProperty[];
  value: string;
  token: TokenMatch;
  deltaE: number | null;
}

const SHORTHANDS = new Map<string, DirectStyleProperty[]>([
  ["background", ["background-color"]],
  ["border", ["border-color"]],
  ["font", ["font-family", "font-size"]],
  ["margin", ["margin-top", "margin-right", "margin-bottom", "margin-left"]],
  [
    "padding",
    ["padding-top", "padding-right", "padding-bottom", "padding-left"],
  ],
]);

const LINTED = Object.keys(TOKEN_GROUP_FOR_PROPERTY) as DirectStyleProperty[];

const CSS_WIDE =
  /^(?:inherit|initial|unset|revert|revert-layer|currentcolor)$/iu;

const BORDER_KEYWORDS =
  /^(?:none|hidden|solid|dashed|dotted|double|groove|ridge|inset|outset|thin|medium|thick|inherit|initial|unset|revert|revert-layer|currentcolor|0|[\d.]+[a-z%]*)$/iu;

const COLOR_SCALE = 1000;
const PERCENT_DIVISOR = 10;
const FONT_FALLBACK_DISTANCE = 1;

const LEADING_NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/iu;

const toLeadingNumber = (text: string): number =>
  Number(LEADING_NUMBER.exec(text.trim())?.[0] ?? "");

const borderHasColor = (value: string): boolean =>
  value
    .split(/\s+/u)
    .some((part) => part !== "" && !BORDER_KEYWORDS.test(part));

const isLintedProp = (prop: string): prop is DirectStyleProperty =>
  LINTED.some((linted) => linted === prop);

const toTargets = (prop: string): DirectStyleProperty[] => {
  const shorthand = SHORTHANDS.get(prop);

  if (shorthand) {
    return shorthand;
  }

  if (isLintedProp(prop)) {
    return [prop];
  }

  return [];
};

const takeDeclarations = (
  text: string,
  out: Map<DirectStyleProperty, string>
): void => {
  for (const { prop, value } of toDeclarations(text)) {
    if (prop !== "border" || borderHasColor(value)) {
      for (const target of toTargets(prop)) {
        out.set(target, value);
      }
    }
  }
};

const authoredProps = (
  css: AuthoredCss | null
): Map<DirectStyleProperty, string> => {
  const out = new Map<DirectStyleProperty, string>();

  if (!css) {
    return out;
  }

  for (const rule of css.rules) {
    takeDeclarations(rule.css, out);
  }

  takeDeclarations(css.inline, out);

  return out;
};

const toKind = (prop: DirectStyleProperty): LintKind => {
  const group = TOKEN_GROUP_FOR_PROPERTY[prop];

  if (group === "color") {
    return "color";
  }

  if (group === "font") {
    return "font";
  }

  return "size";
};

const toFontFallback = (
  prop: DirectStyleProperty,
  entries: CompiledTokenEntry[]
): TokenMatch | null => {
  const pool = tokensForProperty(prop, entries);
  const [first] = pool;
  const entry = pool.find((item) => item.cssVar === "--font-body") ?? first;

  if (!entry) {
    return null;
  }

  return {
    cssVar: entry.cssVar,
    distance: FONT_FALLBACK_DISTANCE,
    exact: false,
    path: entry.path,
    value: entry.value,
  };
};

const hasNoBorder = (values: StyleValues): boolean => {
  const style = values["border-style"] ?? "";
  const width = toLeadingNumber(values["border-width"] ?? "");
  const hasWidth = width > 0;

  return style === "" || style === "none" || style === "hidden" || !hasWidth;
};

const toFontToken = (
  best: TokenMatch | undefined,
  prop: DirectStyleProperty,
  entries: CompiledTokenEntry[]
): TokenMatch | null => {
  if (best?.exact) {
    return best;
  }

  return toFontFallback(prop, entries);
};

interface IssueInput {
  readonly authored: string;
  readonly entries: CompiledTokenEntry[];
  readonly mode: TokenMode;
  readonly prop: DirectStyleProperty;
  readonly value: string;
}

const toIssue = ({
  authored,
  entries,
  mode,
  prop,
  value,
}: IssueInput): LintIssue | null => {
  if (
    authored.includes("var(") ||
    CSS_WIDE.test(authored.trim()) ||
    isUnsetValue(value)
  ) {
    return null;
  }

  const group = TOKEN_GROUP_FOR_PROPERTY[prop];

  if (!group || tokensForProperty(prop, entries).length === 0) {
    return null;
  }

  const [best] = matchForProperty(prop, value, entries, mode);
  const lintKind = toKind(prop);

  if (lintKind === "color") {
    if (!best) {
      return null;
    }

    return {
      deltaE: Math.round(best.distance * COLOR_SCALE) / PERCENT_DIVISOR,
      kind: lintKind,
      props: [prop],
      token: best,
      value,
    };
  }

  if (lintKind === "font") {
    const fontToken = toFontToken(best, prop, entries);

    if (!fontToken) {
      return null;
    }

    return {
      deltaE: null,
      kind: lintKind,
      props: [prop],
      token: fontToken,
      value,
    };
  }

  if (best && isSnappable(group, best)) {
    return {
      deltaE: null,
      kind: lintKind,
      props: [prop],
      token: best,
      value,
    };
  }

  return null;
};

const addIssue = (issues: LintIssue[], issue: LintIssue): void => {
  const same = issues.find(
    (item) =>
      item.token.cssVar === issue.token.cssVar &&
      item.value === issue.value &&
      item.kind === issue.kind
  );

  if (same) {
    same.props.push(...issue.props);
  } else {
    issues.push(issue);
  }
};

const isSkippedProp = (
  prop: DirectStyleProperty,
  values: StyleValues
): boolean => prop === "border-color" && hasNoBorder(values);

interface LintSource {
  readonly css: AuthoredCss | null;
  readonly dirty: readonly DirectStyleProperty[];
}

const lintValues = (
  values: StyleValues,
  entries: CompiledTokenEntry[],
  mode: TokenMode,
  source: LintSource
): LintIssue[] => {
  const authoredMap = authoredProps(source.css);

  for (const prop of source.dirty) {
    authoredMap.set(prop, values[prop]);
  }

  const issues: LintIssue[] = [];

  for (const prop of LINTED) {
    const authored = authoredMap.get(prop) ?? "";
    const value = values[prop];

    if (authoredMap.has(prop) && !isSkippedProp(prop, values)) {
      const issue = toIssue({ authored, entries, mode, prop, value });

      if (issue) {
        addIssue(issues, issue);
      }
    }
  }

  return issues;
};

export { authoredProps, lintValues };

export type { LintIssue, LintKind, LintSource };
