import type { DirectStyleProperty } from '../../shared/contracts.js';
import type { ClassRule, ComponentRule, DesignRule, DesignRuleHit, FontRule, TokenRule } from '../../shared/design-rules.js';
import type { ReviewFix } from '../../shared/review.js';
import type { Draft } from '../review/checks.js';
import { parseLoc } from '../review/checks.js';
import type { RenderPage } from '../preview/render-backend.js';
import { rulesProbeExpression, type ProbeRule, type RuleHitElement, type RuleMiss, type RulesProbeResult } from './probe.js';

const COLOR_VALUE = /^(#|rgb|hsl|oklch|oklab|lab|lch)/i;
const RADIUS = ['border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius'];
const DIRECT: Record<string, DirectStyleProperty> = {
  height: 'height',
  width: 'width',
  'padding-top': 'padding-top',
  'padding-right': 'padding-right',
  'padding-bottom': 'padding-bottom',
  'padding-left': 'padding-left',
  'margin-top': 'margin-top',
  'margin-right': 'margin-right',
  'margin-bottom': 'margin-bottom',
  'margin-left': 'margin-left',
  'font-size': 'font-size',
  'font-weight': 'font-weight',
  'line-height': 'line-height',
  'border-top-width': 'border-width',
};

function probeRule(rule: DesignRule): ProbeRule | null {
  if (rule.kind === 'class') return { id: rule.id, kind: 'class', selector: rule.selector, classes: rule.classes };
  if (rule.kind === 'font') return { id: rule.id, kind: 'font', families: rule.families };
  if (rule.kind === 'component') return { id: rule.id, kind: 'component', name: rule.name, tag: rule.tag };
  return null;
}

export async function probeRules(page: RenderPage, rules: DesignRule[], app: boolean): Promise<RulesProbeResult> {
  const probe = rules.map(probeRule).filter((rule): rule is ProbeRule => rule !== null);
  if (probe.length === 0) return { hits: [], scanned: {} };
  return page.evaluate<RulesProbeResult>(rulesProbeExpression({ rules: probe, app }));
}

function label(hit: RuleHitElement): string {
  return hit.text ? `${hit.tag} "${hit.text}"` : hit.tag;
}

function missText(miss: RuleMiss): string {
  if (!miss.prop) return `the class ${miss.cls} is missing`;
  return `${miss.prop} is ${miss.actual}, ${miss.cls} gives ${miss.expected}`;
}

function radiusStyle(misses: RuleMiss[]): Partial<Record<DirectStyleProperty, string>> {
  const corners = misses.filter((miss) => miss.prop && RADIUS.includes(miss.prop));
  const value = corners[0]?.expected;
  return value && corners.length === RADIUS.length && corners.every((miss) => miss.expected === value) ? { 'border-radius': value } : {};
}

function gapStyle(misses: RuleMiss[]): Partial<Record<DirectStyleProperty, string>> {
  const row = misses.find((miss) => miss.prop === 'row-gap');
  const column = misses.find((miss) => miss.prop === 'column-gap');
  return row?.expected && row.expected === column?.expected ? { gap: row.expected } : {};
}

function classStyle(misses: RuleMiss[]): Partial<Record<DirectStyleProperty, string>> | null {
  if (misses.some((miss) => !miss.prop || (miss.expected !== null && COLOR_VALUE.test(miss.expected)))) return null;
  const style: Partial<Record<DirectStyleProperty, string>> = { ...radiusStyle(misses), ...gapStyle(misses) };
  for (const miss of misses) {
    const prop = miss.prop ? DIRECT[miss.prop] : undefined;
    if (prop && miss.expected) style[prop] = miss.expected;
  }
  const covered = misses.every((miss) => (miss.prop && DIRECT[miss.prop]) || RADIUS.includes(miss.prop ?? '') || miss.prop === 'row-gap' || miss.prop === 'column-gap');
  return covered && Object.keys(style).length > 0 ? style : null;
}

function classFix(hit: RuleHitElement): ReviewFix | null {
  const source = parseLoc(hit.loc);
  const style = classStyle(hit.misses);
  if (!source || !style) return null;
  const classes = [...new Set(hit.misses.map((miss) => miss.cls))];
  return { label: `Use ${classes.join(' ')}`, edit: { source, selector: hit.selector, tag: hit.tag, style } };
}

function head(rule: DesignRule, hit: RuleHitElement): Pick<Draft, 'kind' | 'selector' | 'source' | 'element' | 'rule'> {
  return { kind: 'rule', selector: hit.selector, source: hit.loc ?? hit.nearLoc, element: label(hit), rule: { id: rule.id, text: rule.text } };
}

function classDraft(rule: ClassRule, hit: RuleHitElement): Draft {
  const fix = classFix(hit);
  return {
    ...head(rule, hit),
    key: `${rule.id}|${hit.selector}`,
    severity: 'medium',
    message: `Breaks the rule "${rule.text}": ${hit.misses.map(missText).join('; ')}.`,
    fix,
    ...(fix ? { guard: { noArbitrary: true, classes: hit.classes } } : {}),
    hint: `Follow the design rule "${rule.text}" for this ${rule.target.replace(/s$/, '')}. Use the classes the rule names and keep the rest of the look.`,
  };
}

function fontDraft(rule: FontRule, hit: RuleHitElement): Draft {
  return {
    ...head(rule, hit),
    key: `${rule.id}|${hit.family ?? ''}|${hit.loc ?? hit.selector}`,
    severity: 'medium',
    message: `Breaks the rule "${rule.text}": the text uses ${hit.family ?? 'another font'}.`,
    fix: null,
    hint: `Use only ${rule.families.join(', ')} (through the font token or class of the project) for this text.`,
  };
}

function componentDraft(rule: ComponentRule, hit: RuleHitElement): Draft {
  const from = rule.module ? ` from ${rule.module}` : '';
  return {
    ...head(rule, hit),
    key: `${rule.id}|${hit.loc ?? hit.selector}`,
    severity: 'medium',
    message: `Breaks the rule "${rule.text}": this is a plain <${rule.tag}>, not the ${rule.name} component.`,
    fix: null,
    hint: `Replace this <${rule.tag}> with <${rule.name}>${from}. Add the import, keep the props, the handlers and the text, and pick the variant that matches the current look.`,
  };
}

export function ruleDrafts(rules: DesignRule[], hits: RuleHitElement[]): Draft[] {
  const byId = new Map(rules.map((rule) => [rule.id, rule]));
  return hits.flatMap((hit) => {
    const rule = byId.get(hit.ruleId);
    if (rule?.kind === 'class') return [classDraft(rule, hit)];
    if (rule?.kind === 'font') return [fontDraft(rule, hit)];
    if (rule?.kind === 'component') return [componentDraft(rule, hit)];
    return [];
  });
}

function tokenScopeHits(rule: TokenRule, draft: Draft): boolean {
  if (draft.kind !== 'off-token') return false;
  return rule.scope === 'any' || /raw color/.test(draft.message);
}

export function applyTokenRules(rules: DesignRule[], drafts: Draft[]): Draft[] {
  const tokenRules = rules.filter((rule): rule is TokenRule => rule.kind === 'token');
  if (tokenRules.length === 0) return drafts;
  return drafts.map((draft) => {
    const rule = tokenRules.find((item) => tokenScopeHits(item, draft));
    if (!rule) return draft;
    return { ...draft, kind: 'rule', key: `${rule.id}|${draft.key}`, severity: 'medium', rule: { id: rule.id, text: rule.text }, message: `Breaks the rule "${rule.text}": ${draft.message.charAt(0).toLowerCase()}${draft.message.slice(1)}` };
  });
}

export function ruleHits(rules: DesignRule[], drafts: Pick<Draft, 'rule' | 'element' | 'source' | 'message'>[]): DesignRuleHit[] {
  return rules.map((rule) => {
    const mine = drafts.filter((draft) => draft.rule?.id === rule.id);
    return { ruleId: rule.id, count: mine.length, samples: mine.slice(0, 5).map((draft) => ({ element: draft.element, source: draft.source, message: draft.message })) };
  });
}
