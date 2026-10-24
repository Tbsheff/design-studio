import { TOKEN_GROUP_FOR_PROPERTY, type CompiledTokenEntry, type DirectStyleProperty, type TokenMatch } from '../shared/contracts';
import { isSnappable, isUnsetValue, matchForProperty, tokensForProperty, type TokenMode } from '../shared/token-match';
import { parseDeclarations, type AuthoredCss } from './authoredCss';
import type { StyleValues } from './cssValues';

export type LintKind = 'color' | 'size' | 'font';

export interface LintIssue {
  kind: LintKind;
  props: DirectStyleProperty[];
  value: string;
  token: TokenMatch;
  deltaE: number | null;
}

const SHORTHANDS: Record<string, DirectStyleProperty[]> = {
  padding: ['padding-top', 'padding-right', 'padding-bottom', 'padding-left'],
  margin: ['margin-top', 'margin-right', 'margin-bottom', 'margin-left'],
  background: ['background-color'],
  border: ['border-color'],
  font: ['font-family', 'font-size'],
};

const LINTED = Object.keys(TOKEN_GROUP_FOR_PROPERTY) as DirectStyleProperty[];

export function authoredProps(css: AuthoredCss | null): Map<DirectStyleProperty, string> {
  const out = new Map<DirectStyleProperty, string>();
  if (!css) return out;
  const take = (text: string) => {
    for (const { prop, value } of parseDeclarations(text)) {
      const targets = SHORTHANDS[prop] ?? (LINTED.includes(prop as DirectStyleProperty) ? [prop as DirectStyleProperty] : []);
      for (const target of targets) out.set(target, value);
    }
  };
  for (const rule of css.rules) take(rule.css);
  take(css.inline);
  return out;
}

function kindOf(prop: DirectStyleProperty): LintKind {
  const group = TOKEN_GROUP_FOR_PROPERTY[prop];
  if (group === 'color') return 'color';
  if (group === 'font') return 'font';
  return 'size';
}

function fontFallback(prop: DirectStyleProperty, entries: CompiledTokenEntry[]): TokenMatch | null {
  const pool = tokensForProperty(prop, entries);
  const entry = pool.find((item) => item.cssVar === '--font-body') ?? pool[0];
  return entry ? { cssVar: entry.cssVar, path: entry.path, value: entry.value, distance: 1, exact: false } : null;
}

function issueFor(prop: DirectStyleProperty, value: string, authored: string, entries: CompiledTokenEntry[], mode: TokenMode): LintIssue | null {
  if (/var\(/.test(authored) || isUnsetValue(value)) return null;
  const group = TOKEN_GROUP_FOR_PROPERTY[prop];
  if (!group || tokensForProperty(prop, entries).length === 0) return null;
  const best = matchForProperty(prop, value, entries, mode)[0];
  const kind = kindOf(prop);
  if (kind === 'color') return best ? { kind, props: [prop], value, token: best, deltaE: Math.round(best.distance * 1000) / 10 } : null;
  if (kind === 'font') {
    const token = best?.exact ? best : fontFallback(prop, entries);
    return token ? { kind, props: [prop], value, token, deltaE: null } : null;
  }
  return best && isSnappable(group, best) ? { kind, props: [prop], value, token: best, deltaE: null } : null;
}

export function lintValues(values: StyleValues, entries: CompiledTokenEntry[], mode: TokenMode, css: AuthoredCss | null, dirty: readonly DirectStyleProperty[] = []): LintIssue[] {
  const authored = authoredProps(css);
  for (const prop of dirty) authored.set(prop, values[prop]);
  const issues: LintIssue[] = [];
  for (const prop of LINTED) {
    const source = authored.get(prop);
    if (source === undefined) continue;
    const issue = issueFor(prop, values[prop], source, entries, mode);
    if (!issue) continue;
    const same = issues.find((item) => item.token.cssVar === issue.token.cssVar && item.value === issue.value && item.kind === issue.kind);
    if (same) same.props.push(prop);
    else issues.push(issue);
  }
  return issues;
}
