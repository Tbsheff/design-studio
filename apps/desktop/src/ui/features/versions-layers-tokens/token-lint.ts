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
import { parseDeclarations } from "../inspector/authored-css.js";
import type { AuthoredCss } from "../inspector/authored-css.js";
import type { StyleValues } from "../inspector/css-values.js";

export type LintKind = "color" | "size" | "font";

export interface LintIssue {
  kind: LintKind;
  props: DirectStyleProperty[];
  value: string;
  token: TokenMatch;
  deltaE: number | null;
}

const SHORTHANDS: Record<string, DirectStyleProperty[]> = {
  background: ["background-color"],
  border: ["border-color"],
  font: ["font-family", "font-size"],
  margin: ["margin-top", "margin-right", "margin-bottom", "margin-left"],
  padding: ["padding-top", "padding-right", "padding-bottom", "padding-left"],
};

const LINTED = Object.keys(TOKEN_GROUP_FOR_PROPERTY) as DirectStyleProperty[];
const CSS_WIDE = /^(inherit|initial|unset|revert|revert-layer|currentcolor)$/i;

const BORDER_KEYWORDS =
  /^(none|hidden|solid|dashed|dotted|double|groove|ridge|inset|outset|thin|medium|thick|inherit|initial|unset|revert|revert-layer|currentcolor|0|[\d.]+[a-z%]*)$/i;

function borderHasColor(value: string): boolean {
  return value
    .split(/\s+/)
    .some((part) => part !== "" && !BORDER_KEYWORDS.test(part));
}

export function authoredProps(
  css: AuthoredCss | null
): Map<DirectStyleProperty, string> {
  const out = new Map<DirectStyleProperty, string>();

  if (!css) {
    return out;
  }

  const take = (text: string) => {
    for (const { prop, value } of parseDeclarations(text)) {
      if (prop === "border" && !borderHasColor(value)) {
        continue;
      }

      const targets =
        SHORTHANDS[prop] ??
        (LINTED.includes(prop as DirectStyleProperty)
          ? [prop as DirectStyleProperty]
          : []);

      for (const target of targets) {
        out.set(target, value);
      }
    }
  };

  for (const rule of css.rules) {
    take(rule.css);
  }

  take(css.inline);

  return out;
}

function kindOf(prop: DirectStyleProperty): LintKind {
  const group = TOKEN_GROUP_FOR_PROPERTY[prop];

  if (group === "color") {
    return "color";
  }

  if (group === "font") {
    return "font";
  }

  return "size";
}

function fontFallback(
  prop: DirectStyleProperty,
  entries: CompiledTokenEntry[]
): TokenMatch | null {
  const pool = tokensForProperty(prop, entries);
  const entry = pool.find((item) => item.cssVar === "--font-body") ?? pool[0];

  return entry
    ? {
        cssVar: entry.cssVar,
        distance: 1,
        exact: false,
        path: entry.path,
        value: entry.value,
      }
    : null;
}

function noBorder(values: StyleValues): boolean {
  const style = values["border-style"] ?? "";

  return (
    style === "" ||
    style === "none" ||
    style === "hidden" ||
    !(Number.parseFloat(values["border-width"] ?? "") > 0)
  );
}

function issueFor(
  prop: DirectStyleProperty,
  value: string,
  authored: string,
  entries: CompiledTokenEntry[],
  mode: TokenMode
): LintIssue | null {
  if (
    /var\(/.test(authored) ||
    CSS_WIDE.test(authored.trim()) ||
    isUnsetValue(value)
  ) {
    return null;
  }

  const group = TOKEN_GROUP_FOR_PROPERTY[prop];

  if (!group || tokensForProperty(prop, entries).length === 0) {
    return null;
  }

  const best = matchForProperty(prop, value, entries, mode)[0];
  const kind = kindOf(prop);

  if (kind === "color") {
    return best
      ? {
          deltaE: Math.round(best.distance * 1000) / 10,
          kind,
          props: [prop],
          token: best,
          value,
        }
      : null;
  }

  if (kind === "font") {
    const token = best?.exact ? best : fontFallback(prop, entries);

    return token ? { deltaE: null, kind, props: [prop], token, value } : null;
  }

  return best && isSnappable(group, best)
    ? { deltaE: null, kind, props: [prop], token: best, value }
    : null;
}

export function lintValues(
  values: StyleValues,
  entries: CompiledTokenEntry[],
  mode: TokenMode,
  css: AuthoredCss | null,
  dirty: readonly DirectStyleProperty[] = []
): LintIssue[] {
  const authored = authoredProps(css);

  for (const prop of dirty) {
    authored.set(prop, values[prop]);
  }

  const issues: LintIssue[] = [];

  for (const prop of LINTED) {
    const source = authored.get(prop);

    if (source === undefined || (prop === "border-color" && noBorder(values))) {
      continue;
    }

    const issue = issueFor(prop, values[prop], source, entries, mode);

    if (!issue) {
      continue;
    }

    const same = issues.find(
      (item) =>
        item.token.cssVar === issue.token.cssVar &&
        item.value === issue.value &&
        item.kind === issue.kind
    );

    if (same) {
      same.props.push(prop);
    } else {
      issues.push(issue);
    }
  }

  return issues;
}
