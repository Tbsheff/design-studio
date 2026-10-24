import type { AuthoredRule } from '../shared/contracts.js';

export const AUTHORED_MAX_RULES = 60;
export const AUTHORED_MAX_BYTES = 20_000;
const MAX_DEPTH = 6;
const MAX_PATH = 20;
const MAX_LABEL = 60;

interface Collector {
  rules: AuthoredRule[];
  bytes: number;
  full: boolean;
}

function sourceOf(sheet: CSSStyleSheet): string | null {
  if (sheet.href) {
    try {
      const name = new URL(sheet.href).pathname.split('/').filter(Boolean).at(-1);
      return name ? decodeURIComponent(name) : sheet.href;
    } catch {
      return sheet.href;
    }
  }
  return sheet.ownerNode instanceof HTMLStyleElement ? '<style>' : null;
}

function isStudioSheet(sheet: CSSStyleSheet): boolean {
  const owner = sheet.ownerNode;
  return owner instanceof Element && owner.id.startsWith('studio-');
}

function rulesOf(sheet: CSSStyleSheet): CSSRuleList | null {
  try {
    return sheet.cssRules;
  } catch {
    return null;
  }
}

function matches(element: Element, selector: string): boolean {
  try {
    return element.matches(selector);
  } catch {
    return false;
  }
}

function groupApplies(rule: CSSRule): boolean {
  if (rule instanceof CSSMediaRule) return window.matchMedia(rule.media.mediaText).matches;
  if (rule instanceof CSSSupportsRule) {
    try {
      return CSS.supports(rule.conditionText);
    } catch {
      return false;
    }
  }
  return typeof CSSLayerBlockRule !== 'undefined' && rule instanceof CSSLayerBlockRule;
}

function add(collector: Collector, rule: AuthoredRule): void {
  const size = rule.selector.length + rule.css.length;
  if (collector.rules.length >= AUTHORED_MAX_RULES || collector.bytes + size > AUTHORED_MAX_BYTES) {
    collector.full = true;
    return;
  }
  collector.rules.push(rule);
  collector.bytes += size;
}

function visit(element: Element, rule: CSSRule, source: string | null, collector: Collector, depth: number): void {
  if (rule instanceof CSSStyleRule) {
    if (rule.style.length > 0 && matches(element, rule.selectorText)) add(collector, { selector: rule.selectorText, css: rule.style.cssText, source });
    return;
  }
  if (rule instanceof CSSImportRule) {
    const imported = rule.styleSheet;
    const nested = imported ? rulesOf(imported) : null;
    if (imported && nested) walk(element, nested, sourceOf(imported), collector, depth + 1);
    return;
  }
  if (rule instanceof CSSGroupingRule && groupApplies(rule)) walk(element, rule.cssRules, source, collector, depth + 1);
}

function walk(element: Element, list: CSSRuleList, source: string | null, collector: Collector, depth: number): void {
  if (depth > MAX_DEPTH) return;
  for (const rule of Array.from(list)) {
    if (collector.full) return;
    visit(element, rule, source, collector, depth);
  }
}

export function authoredRules(element: Element): AuthoredRule[] {
  const collector: Collector = { rules: [], bytes: 0, full: false };
  for (const sheet of Array.from(document.styleSheets)) {
    if (collector.full) break;
    if (sheet.disabled || isStudioSheet(sheet)) continue;
    const media = sheet.media.mediaText;
    if (media && !window.matchMedia(media).matches) continue;
    const list = rulesOf(sheet);
    if (list) walk(element, list, sourceOf(sheet), collector, 0);
  }
  return collector.rules;
}

function crumbLabel(element: Element): string {
  const tag = element.tagName.toLowerCase();
  const firstClass = (element.getAttribute('class') ?? '').trim().split(/\s+/)[0];
  const label = element.id ? `${tag}#${element.id}` : firstClass ? `${tag}.${firstClass}` : tag;
  return label.slice(0, MAX_LABEL);
}

export function ancestorPath(element: Element): string[] {
  const path: string[] = [];
  let current = element.parentElement;
  while (current && current !== document.body && current !== document.documentElement && path.length < MAX_PATH) {
    path.unshift(crumbLabel(current));
    current = current.parentElement;
  }
  return path;
}
