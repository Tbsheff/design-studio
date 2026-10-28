import { createHash } from 'node:crypto';
import { DESIGN_RULES_MAX, type ClassRule, type ComponentRule, type DesignRule, type FontRule, type TokenRule } from '../../shared/design-rules.js';

const FIELD = 'input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]):not([type="range"]):not([type="file"]):not([type="color"]):not([type="submit"]):not([type="button"])';

export const RULE_TARGETS: Record<string, string> = {
  control: `button, ${FIELD}, select`,
  button: 'button, input[type="submit"], input[type="button"]',
  input: FIELD,
  field: `${FIELD}, select, textarea`,
  select: 'select, [role="combobox"]',
  textarea: 'textarea',
  card: '[data-slot="card"], .card',
  badge: '[data-slot="badge"], .badge',
  dialog: '[role="dialog"], dialog',
  link: 'a[href]',
  heading: 'h1, h2, h3, h4, h5, h6',
  table: 'table',
  image: 'img',
};

const CLASS_TOKEN = /^(?:[a-z0-9-]+:)*!?-?[a-z][a-z0-9-]*(?:-[a-z0-9.\/%]+|\[[^\]\s]+\])*$/i;
const BARE_CLASSES = new Set(['border', 'rounded', 'shadow', 'flex', 'grid', 'block', 'hidden', 'truncate', 'italic', 'underline', 'uppercase']);

function ruleId(text: string): string {
  return `r-${createHash('sha1').update(text.toLowerCase()).digest('hex').slice(0, 10)}`;
}

function cleanLine(raw: string): string {
  return raw
    .replace(/^\s*(?:[-*+]|\d+[.)])\s+/, '')
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function targetSelector(raw: string): string | null {
  const quoted = /^`([^`]+)`$/.exec(raw.trim());
  if (quoted?.[1]) return quoted[1].trim();
  const word = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  const single = word.endsWith('es') && RULE_TARGETS[word.slice(0, -2)] ? word.slice(0, -2) : word.endsWith('s') ? word.slice(0, -1) : word;
  return RULE_TARGETS[single] ?? RULE_TARGETS[word] ?? null;
}

function isClass(token: string): boolean {
  if (!CLASS_TOKEN.test(token)) return false;
  return token.includes('-') || token.includes(':') || BARE_CLASSES.has(token);
}

function classGroups(spec: string): string[][] | null {
  const tokens = spec.replace(/`/g, '').split(/[\s,]+/).filter(Boolean);
  if (tokens.length === 0) return null;
  const groups = tokens.map((token) => token.split('|').filter(Boolean));
  return groups.every((alts) => alts.length > 0 && alts.every(isClass)) ? groups : null;
}

function classRule(line: string, text: string): ClassRule | null {
  const colon = /^(`[^`]+`|[a-z][a-z ]{1,30}?)\s*:\s*(.+)$/i.exec(line);
  const bare = colon ? null : /^([a-z]+)\s+(.+)$/i.exec(line);
  const match = colon ?? bare;
  if (!match?.[1] || !match[2]) return null;
  const selector = targetSelector(match[1]);
  const classes = selector ? classGroups(match[2]) : null;
  if (!selector || !classes) return null;
  return { id: ruleId(text), kind: 'class', text, target: match[1].replace(/`/g, '').trim(), selector, classes };
}

function tokenRule(line: string, text: string): TokenRule | null {
  if (/^(?:no|never(?: use)?)\s+(?:raw\s+|hard-?coded\s+)?(?:hex|colou?rs?|colou?r values)(?:\s+values)?$/i.test(line)) return { id: ruleId(text), kind: 'token', text, scope: 'color' };
  if (/^colou?rs?\s*:\s*tokens?(?:\s+only)?$/i.test(line)) return { id: ruleId(text), kind: 'token', text, scope: 'color' };
  if (/^(?:no|never(?: use)?)\s+(?:raw|arbitrary|hard-?coded)\s+values$/i.test(line) || /^tokens?\s+only$/i.test(line)) return { id: ruleId(text), kind: 'token', text, scope: 'any' };
  return null;
}

function familyList(raw: string): string[] {
  return raw
    .split(/,|\band\b|\bor\b/)
    .map((part) => part.replace(/["'`]/g, '').trim())
    .filter((part) => part.length > 0 && part.length < 40);
}

function fontRule(line: string, text: string): FontRule | null {
  const named = /^fonts?\s*:\s*(.+)$/i.exec(line) ?? /^only\s+(?:use\s+)?(.+?)(?:\s+fonts?)?$/i.exec(line);
  const families = named?.[1] ? familyList(named[1]) : [];
  if (families.length === 0 || families.some((family) => family.split(' ').length > 3)) return null;
  if (!/^fonts?\s*:/i.test(line) && families.some((family) => isClass(family) || /^[a-z]/.test(family))) return null;
  return { id: ruleId(text), kind: 'font', text, families };
}

function componentRule(line: string, text: string): ComponentRule | null {
  const match = /^use\s+(?:the\s+)?(?:(\S+)\s+)?<?([A-Z][A-Za-z0-9]*)>?(?:\s+from\s+(\S+?))?\s*[,;]?\s*(?:not|instead of|never)\s+(?:a\s+|an\s+|raw\s+|plain\s+)*<([a-z][a-z0-9-]*)\s*\/?>/.exec(line);
  if (!match?.[2] || !match[4]) return null;
  const module = (match[3] ?? match[1] ?? '').replace(/[`'",]/g, '') || null;
  return { id: ruleId(text), kind: 'component', text, name: match[2], module, tag: match[4].toLowerCase() };
}

export function parseRuleLine(raw: string): DesignRule | null {
  const line = cleanLine(raw);
  if (!line || line.startsWith('#') || line.startsWith('//') || /^```/.test(line)) return null;
  const text = line;
  return tokenRule(line, text) ?? componentRule(line, text) ?? fontRule(line, text) ?? classRule(line, text) ?? { id: ruleId(text), kind: 'text', text };
}

export function parseRules(text: string): DesignRule[] {
  const seen = new Set<string>();
  const out: DesignRule[] = [];
  for (const line of text.replace(/\r\n/g, '\n').split('\n')) {
    const rule = parseRuleLine(line);
    if (!rule || seen.has(rule.id)) continue;
    seen.add(rule.id);
    out.push(rule);
    if (out.length >= DESIGN_RULES_MAX) break;
  }
  return out;
}

export function isTestable(rule: DesignRule): boolean {
  return rule.kind !== 'text';
}
