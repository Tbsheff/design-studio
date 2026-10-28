import { APP_SOURCE_PATH } from '../../shared/app.js';
import { SOURCE_LOC_ATTR, type ComponentUse, type SelectionContext, type SourceLoc, type TextSourceHints } from '../../shared/contracts.js';
import type { ComponentOwner } from '../../shared/props.js';
import { ownerWalk } from '../components/owner-probe.js';
import { waitForPage } from '../export/capture.js';
import type { PreviewService } from '../types.js';

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

function appSourceBody(): string {
  return `async (el) => {
    const fiberOf = (node) => { const key = Object.keys(node).find((k) => k.startsWith('__reactFiber$')); return key ? node[key] : null; };
    const stackOf = (f) => [f?._debugStack?.stack, f?.debugStack?.stack, f?.stack].find((v) => typeof v === 'string' && v.length > 0) || '';
    const fiber = fiberOf(el);
    if (!fiber) return null;
    const owner = fiber._debugOwner || null;
    const type = owner?.type;
    const name = typeof owner?.name === 'string' ? owner.name : type?.displayName || type?.render?.displayName || type?.render?.name || type?.type?.displayName || type?.type?.name || type?.name || null;
    let parent = el.parentElement;
    while (parent && !fiberOf(parent)) parent = parent.parentElement;
    const root = !parent || (fiberOf(parent)._debugOwner || null) !== owner;
    const stacks = [stackOf(fiber), stackOf(owner)];
    if (stacks.every((stack) => stack === '')) return null;
    try {
      const res = await fetch(${JSON.stringify(APP_SOURCE_PATH)}, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ stacks }), cache: 'no-store' });
      const body = res.ok ? await res.json() : null;
      const [own, used] = Array.isArray(body?.sources) ? body.sources : [];
      const loc = own || used || null;
      const file = (value) => String(value).replace(/:\\d+:\\d+$/, '');
      const usedAt = own && used && file(own) !== file(used) ? used : null;
      return loc ? { loc, usedAt, usedBy: usedAt && name ? { name, root } : null } : null;
    } catch { return null; }
  }`;
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

function parseLoc(raw: string | null): SourceLoc | null {
  const match = raw ? /^(.+):(\d+):(\d+)$/.exec(raw) : null;
  return match ? { file: match[1] as string, line: Number(match[2]), col: Number(match[3]) } : null;
}

function contextOf(selector: string, raw: RawElement): SelectionContext {
  return { selector, tag: raw.tag, text: raw.text, outerHTML: raw.outerHTML, styles: raw.styles, rect: raw.rect, source: parseLoc(raw.loc), usedAt: parseLoc(raw.usedAt), usedBy: raw.usedBy, owners: raw.owners ?? [], ancestors: raw.ancestors };
}

export async function describeElements(preview: PreviewService, url: string, selectors: string[]): Promise<(SelectionContext | null)[]> {
  if (!preview.withPage) throw new Error('rendering is not available');
  const raws = await preview.withPage(url, { width: 1440, height: 900 }, async (page) => {
    await waitForPage(page);
    return page.evaluate<(RawElement | null)[]>(probeAll(selectors));
  });
  return selectors.map((selector, index) => {
    const raw = raws[index];
    return raw ? contextOf(selector, raw) : null;
  });
}

export async function describeElement(preview: PreviewService, url: string, selector: string): Promise<SelectionContext | null> {
  if (!preview.withPage) throw new Error('rendering is not available');
  const raw = await preview.withPage(url, { width: 1440, height: 900 }, async (page) => {
    await waitForPage(page);
    return page.evaluate<RawElement | null>(probe(selector));
  });
  return raw ? contextOf(selector, raw) : null;
}

export function textHintsOf(element: SelectionContext): TextSourceHints {
  return { text: element.text, ...(element.usedAt ? { usedAt: element.usedAt } : {}), ...(element.owners?.length ? { owners: element.owners } : {}) };
}
