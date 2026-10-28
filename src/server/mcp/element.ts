import { SOURCE_LOC_ATTR, type ComponentUse, type SelectionContext, type SourceLoc, type TextSourceHints } from '../../shared/contracts.js';
import type { ComponentOwner } from '../../shared/props.js';
import { appSourceBody, ownerWalk, parseLoc } from '../components/owner-probe.js';
import type { PreviewService } from '../types.js';
import { probeOnPage } from '../preview/probe-page.js';

const STYLE_KEYS = ['display', 'position', 'color', 'background-color', 'font-family', 'font-size', 'font-weight', 'line-height', 'padding', 'margin', 'border-radius', 'width', 'height', 'gap'];

interface RawElement {
  tag: string;
  text: string;
  outerHTML: string;
  styles: Record<string, string>;
  rect: { x: number; y: number; width: number; height: number };
  loc: string | null;
  usedAt: string | null;
  usedBy: ComponentUse | null;
  owners: ComponentOwner[];
  ancestors: string[];
}

function probe(selector: string): string {
  return `(${probeBody()})(${JSON.stringify(selector)})`;
}

function probeBody(): string {
  return `(async (selector) => {
    let el;
    try { el = document.querySelector(selector); } catch { return null; }
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const styles = {};
    for (const key of ${JSON.stringify(STYLE_KEYS)}) styles[key] = cs.getPropertyValue(key);
    const ancestors = [];
    for (let p = el.parentElement; p && ancestors.length < 6; p = p.parentElement) ancestors.push(p.tagName.toLowerCase() + (p.id ? '#' + p.id : ''));
    const tagged = el.getAttribute(${JSON.stringify(SOURCE_LOC_ATTR)});
    const app = tagged ? null : await (${appSourceBody()})(el);
    return { tag: el.tagName.toLowerCase(), text: (el.textContent || '').trim().slice(0, 2000), outerHTML: el.outerHTML.slice(0, 10000), styles, rect: { x: Math.round(r.x), y: Math.round(r.y + scrollY), width: Math.round(r.width), height: Math.round(r.height) }, loc: tagged || app?.loc || null, usedAt: app?.usedAt ?? null, usedBy: app?.usedBy ?? null, owners: ${ownerWalk()}(el), ancestors };
  })`;
}

function probeAll(selectors: string[]): string {
  return `Promise.all((${JSON.stringify(selectors)}).map(${probeBody()}))`;
}

function contextOf(selector: string, raw: RawElement): SelectionContext {
  return { selector, tag: raw.tag, text: raw.text, outerHTML: raw.outerHTML, styles: raw.styles, rect: raw.rect, source: parseLoc(raw.loc), usedAt: parseLoc(raw.usedAt), usedBy: raw.usedBy, owners: raw.owners ?? [], ancestors: raw.ancestors };
}

const PROBE_VIEWPORT = { width: 1440, height: 900 };

function onProbePage<T>(preview: PreviewService, url: string, expression: string): Promise<T> {
  return probeOnPage<T>(preview, url, PROBE_VIEWPORT, expression);
}

export async function describeElements(preview: PreviewService, url: string, selectors: string[]): Promise<(SelectionContext | null)[]> {
  const raws = await onProbePage<(RawElement | null)[]>(preview, url, probeAll(selectors));
  return selectors.map((selector, index) => {
    const raw = raws[index];
    return raw ? contextOf(selector, raw) : null;
  });
}

export async function describeElement(preview: PreviewService, url: string, selector: string): Promise<SelectionContext | null> {
  const raw = await onProbePage<RawElement | null>(preview, url, probe(selector));
  return raw ? contextOf(selector, raw) : null;
}

export function textHintsOf(element: SelectionContext): TextSourceHints {
  return { text: element.text, ...(element.usedAt ? { usedAt: element.usedAt } : {}), ...(element.owners?.length ? { owners: element.owners } : {}) };
}
