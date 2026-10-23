import { describe, expect, it } from 'vitest';
import type { NavSummary, QualityFinding } from '../../shared/contracts.js';
import { capFindings, countSeverities, duplicateFindings, genericFindings, navFindings, placeholderFindings, tapFindings } from './quality.js';

const nav = (visibleLinks: number, menuControl = false): NavSummary => ({ navs: 1, totalLinks: 5, visibleLinks, menuControl });

describe('nav-mobile rule', () => {
  it('flags high when desktop shows links and mobile shows none and has no menu button', () => {
    const findings = navFindings([
      { viewport: 'desktop', nav: nav(5) },
      { viewport: 'mobile', nav: nav(0) },
    ]);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ check: 'nav-mobile', severity: 'high', viewport: 'mobile' });
    expect(findings[0]?.fix).toContain('Do not remove the nav');
  });

  it('accepts a menu button or wrapped links at mobile, and pages with no desktop nav', () => {
    expect(navFindings([{ viewport: 'desktop', nav: nav(5) }, { viewport: 'mobile', nav: nav(0, true) }])).toEqual([]);
    expect(navFindings([{ viewport: 'desktop', nav: nav(5) }, { viewport: 'mobile', nav: nav(5) }])).toEqual([]);
    expect(navFindings([{ viewport: 'desktop', nav: nav(1) }, { viewport: 'mobile', nav: nav(0) }])).toEqual([]);
    expect(navFindings([{ viewport: 'mobile', nav: nav(0) }])).toEqual([]);
  });
});

describe('tap targets', () => {
  it('rates targets under 24 px high and under 44 px medium', () => {
    const findings = tapFindings(
      [
        { selector: 'button.x', source: 'index.html:3:1', text: 'x', width: 20, height: 20 },
        { selector: 'a.more', source: null, text: 'More', width: 80, height: 32 },
      ],
      'mobile',
    );
    expect(findings.map((finding) => finding.severity)).toEqual(['high', 'medium']);
    expect(findings[0]).toMatchObject({ check: 'tap-target', source: 'index.html:3:1', viewport: 'mobile' });
    expect(findings[1]?.message).toContain('80x32 px');
  });
});

describe('placeholder text', () => {
  const hits = [
    { selector: 'p', source: null, text: 'Address to come', match: 'to come', optedOut: false },
    { selector: 'p.s', source: null, text: 'Sample data for the demo', match: 'Sample data', optedOut: true },
  ];

  it('warns in prototype, is high in polish, lowers opted-out sample data, and is off in wireframe', () => {
    expect(placeholderFindings(hits, 'medium', 'desktop').map((finding) => finding.severity)).toEqual(['medium', 'low']);
    expect(placeholderFindings(hits, 'high', 'desktop').map((finding) => finding.severity)).toEqual(['high', 'low']);
    expect(placeholderFindings(hits, 'off', 'desktop')).toEqual([]);
    expect(placeholderFindings(hits, 'high', 'desktop')[1]?.message).toContain('data-sample');
  });
});

describe('finding caps', () => {
  it('keeps the worst findings per check and counts the rest', () => {
    const many: QualityFinding[] = Array.from({ length: 12 }, (_, index) => ({ check: 'a11y', severity: index === 11 ? 'high' : 'low', viewport: 'desktop', selector: `#e${index}`, source: null, message: 'm' }));
    const capped = capFindings([...many, { check: 'tokens', severity: 'medium', viewport: null, selector: null, source: 'a.css:1', message: 't' }], 8);
    expect(capped.findings.filter((finding) => finding.check === 'a11y')).toHaveLength(8);
    expect(capped.findings[0]?.severity).toBe('high');
    expect(capped.omitted).toEqual({ a11y: 4 });
    expect(countSeverities(many)).toEqual({ high: 1, medium: 0, low: 11 });
  });
});

describe('generic layout findings', () => {
  it('reports each stock pattern as medium with a content-fitting layout change', () => {
    const findings = genericFindings([
      { pattern: 'plan-cards', detail: 'three equal plan cards in one row with the middle one filled or raised, then a comparison table, then an FAQ', selector: 'div.plans', source: 'index.html:40:5' },
      { pattern: 'all-centered', detail: '5 of 5 section headings are centered', selector: null, source: null },
    ]);
    expect(findings.map((finding) => [finding.check, finding.severity, finding.viewport])).toEqual([
      ['generic-layout', 'medium', 'desktop'],
      ['generic-layout', 'medium', 'desktop'],
    ]);
    expect(findings[0]?.message).toContain('"plan-cards": three equal plan cards');
    expect(findings[0]?.fix).toContain('plan selector with one detailed plan column');
    expect(findings[0]?.fix).toContain('Keep every plan');
    expect(findings[0]?.source).toBe('index.html:40:5');
  });
});

describe('duplicate content findings', () => {
  it('reports each repeated price or call to action as medium, with count, selectors and the opt-out', () => {
    const [price, cta] = duplicateFindings(
      [
        { kind: 'price', text: '$19/mo', count: 2, selectors: ['th > span.hp', 'article.plan > div.price'], sources: [null, 'index.html:137:9'] },
        { kind: 'cta', text: 'Start trial', count: 3, selectors: ['a.btn', 'a.btn', 'a.btn'], sources: [null, null, null] },
      ],
      'desktop',
    );
    expect(price).toMatchObject({ check: 'duplicate-content', severity: 'medium', viewport: 'desktop', source: 'index.html:137:9', selector: 'th > span.hp | article.plan > div.price' });
    expect(price?.message).toBe('The price "$19/mo" shows 2 times at desktop: th > span.hp | article.plan > div.price.');
    expect(cta?.message).toContain('call to action "Start trial" shows 3 times');
    expect(price?.fix).toContain('data-studio-repeat');
  });
});
