import type { MeasureRect } from '../../shared/arrange.js';
import type { ArrangeFacts, ArrangeParentFacts, ArrangeTargetFacts } from '../../shared/arrange-plan.js';
import { SOURCE_LOC_ATTR, type ComponentUse, type SourceLoc } from '../../shared/contracts.js';
import { appSourceBody, parseLoc } from '../components/owner-probe.js';
import { waitForPage } from '../export/capture.js';
import type { PreviewService } from '../types.js';

type Viewport = { width: number; height: number };

interface RawSource {
  loc: string | null;
  usedAt: string | null;
  usedBy: ComponentUse | null;
}

type RawTarget = Omit<ArrangeTargetFacts, 'source'> & RawSource;
type RawParent = Omit<ArrangeParentFacts, 'source'> & RawSource;

type RawProbe = { error: string } | { targets: RawTarget[]; parent: RawParent | null; sameParent: boolean; container: MeasureRect | null };

export interface ProbedSource {
  source: SourceLoc | null;
  usedAt: SourceLoc | null;
  usedBy: ComponentUse | null;
  tag: string;
}

export interface ArrangeProbe {
  facts: ArrangeFacts;
  sources: Map<string, ProbedSource>;
}

const HELPERS = `
  const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
  const box = (r) => ({ x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height });
  const sides = (cs, prop) => ({ top: num(cs.getPropertyValue(prop + '-top' + (prop === 'border' ? '-width' : ''))), right: num(cs.getPropertyValue(prop + '-right' + (prop === 'border' ? '-width' : ''))), bottom: num(cs.getPropertyValue(prop + '-bottom' + (prop === 'border' ? '-width' : ''))), left: num(cs.getPropertyValue(prop + '-left' + (prop === 'border' ? '-width' : ''))) });
  const uniqueId = (el) => { if (!el.id) return null; const s = '#' + CSS.escape(el.id); try { return document.querySelectorAll(s).length === 1 ? s : null; } catch { return null; } };
  const nthOfType = (el) => { const tag = el.tagName.toLowerCase(); const p = el.parentElement; if (!p) return tag; let index = 0; let count = 0; for (const sib of Array.from(p.children)) { if (sib.tagName === el.tagName) { count += 1; if (sib === el) index = count; } } return count > 1 ? tag + ':nth-of-type(' + index + ')' : tag; };
  const selectorFor = (el) => { const own = uniqueId(el); if (own) return own; const parts = []; let cur = el; while (cur && cur !== document.body && cur !== document.documentElement) { if (parts.length >= 12) break; const id = parts.length > 0 ? uniqueId(cur) : null; if (id) { parts.unshift(id); return parts.join(' > '); } parts.unshift(nthOfType(cur)); cur = cur.parentElement; } if (cur === document.body) parts.unshift('body'); return parts.length ? parts.join(' > ') : el.tagName.toLowerCase(); };
  const appSource = ${appSourceBody()};
  const sourceOf = async (el) => { const tagged = el.getAttribute(${JSON.stringify(SOURCE_LOC_ATTR)}); if (tagged) return { loc: tagged, usedAt: null, usedBy: null }; const app = await appSource(el); return { loc: app?.loc || null, usedAt: app?.usedAt ?? null, usedBy: app?.usedBy ?? null }; };
  const paddingBox = (el) => { if (!el) return { x: scrollX, y: scrollY, width: innerWidth, height: innerHeight }; const r = el.getBoundingClientRect(); const b = sides(getComputedStyle(el), 'border'); return { x: r.x + scrollX + b.left, y: r.y + scrollY + b.top, width: el.clientWidth, height: el.clientHeight }; };
  const inFlow = (el) => { const cs = getComputedStyle(el); return cs.display !== 'none' && cs.position !== 'absolute' && cs.position !== 'fixed'; };
`;

function probeExpression(selectors: string[]): string {
  return `(async (selectors) => {
    ${HELPERS}
    const els = [];
    for (const s of selectors) {
      let el = null;
      try { el = document.querySelector(s); } catch { return { error: 'The selector ' + s + ' is not valid.' }; }
      if (!el) return { error: 'No element matches ' + s + ' on the page.' };
      if (els.includes(el)) return { error: s + ' is the same element as another target.' };
      els.push(el);
    }
    const parentEl = els[0].parentElement;
    const sameParent = els.every((el) => el.parentElement === parentEl);
    const kids = parentEl ? Array.from(parentEl.children) : [];
    const kidSources = new Map();
    const found = await Promise.all(kids.map((kid) => sourceOf(kid)));
    kids.forEach((kid, i) => kidSources.set(kid, found[i]));
    const targets = [];
    for (const [i, el] of els.entries()) {
      const cs = getComputedStyle(el);
      const src = kidSources.get(el) || await sourceOf(el);
      const copies = src.loc ? kids.filter((kid) => kidSources.get(kid)?.loc === src.loc).length : 1;
      targets.push({ selector: selectors[i], tag: el.tagName.toLowerCase(), ...src, rect: box(el.getBoundingClientRect()), position: cs.position, left: num(cs.left), top: num(cs.top), margin: sides(cs, 'margin'), alignSelf: cs.alignSelf, copies });
    }
    let parent = null;
    if (parentEl && sameParent) {
      const cs = getComputedStyle(parentEl);
      const flow = kids.filter(inFlow);
      parent = { selector: selectorFor(parentEl), tag: parentEl.tagName.toLowerCase(), ...(await sourceOf(parentEl)), display: cs.display, flexDirection: cs.flexDirection, flexWrap: cs.flexWrap, rowGap: num(cs.rowGap), columnGap: num(cs.columnGap), justifyContent: cs.justifyContent, alignItems: cs.alignItems, justifyItems: cs.justifyItems, padding: sides(cs, 'padding'), rect: box(parentEl.getBoundingClientRect()), inFlow: flow.length, allSelected: flow.length > 0 && flow.every((kid) => els.includes(kid)) };
    }
    const first = els[0];
    const container = getComputedStyle(first).position === 'fixed' ? paddingBox(null) : paddingBox(first.offsetParent);
    return { targets, parent, sameParent, container };
  })(${JSON.stringify(selectors)})`;
}

function sourceEntry(raw: RawSource & { tag: string }): ProbedSource {
  return { source: parseLoc(raw.loc), usedAt: parseLoc(raw.usedAt), usedBy: raw.usedBy, tag: raw.tag };
}

export class ArrangeProbeError extends Error {}

export async function probeArrange(preview: PreviewService, url: string, viewport: Viewport, selectors: string[]): Promise<ArrangeProbe> {
  if (!preview.withPage) throw new Error('rendering is not available');
  const raw = await preview.withPage(url, viewport, async (page) => {
    await waitForPage(page);
    return page.evaluate<RawProbe>(probeExpression(selectors));
  });
  if ('error' in raw) throw new ArrangeProbeError(raw.error);
  const sources = new Map<string, ProbedSource>();
  const targets = raw.targets.map(({ loc, usedAt, usedBy, ...rest }) => {
    sources.set(rest.selector, sourceEntry({ loc, usedAt, usedBy, tag: rest.tag }));
    return { ...rest, source: parseLoc(loc) };
  });
  let parent: ArrangeParentFacts | null = null;
  if (raw.parent) {
    const { loc, usedAt, usedBy, ...rest } = raw.parent;
    if (!sources.has(rest.selector)) sources.set(rest.selector, sourceEntry({ loc, usedAt, usedBy, tag: rest.tag }));
    parent = { ...rest, source: parseLoc(loc) };
  }
  return { facts: { targets, parent, sameParent: raw.sameParent, container: raw.container }, sources };
}

function rectsExpression(selectors: string[]): string {
  return `((selectors) => selectors.map((s) => {
    let el = null;
    try { el = document.querySelector(s); } catch { return null; }
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height };
  }))(${JSON.stringify(selectors)})`;
}

export async function probeRects(preview: PreviewService, url: string, viewport: Viewport, selectors: string[]): Promise<(MeasureRect | null)[]> {
  if (!preview.withPage) throw new Error('rendering is not available');
  return preview.withPage(url, viewport, async (page) => {
    await waitForPage(page);
    return page.evaluate<(MeasureRect | null)[]>(rectsExpression(selectors));
  });
}
