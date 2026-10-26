import { SOURCE_LOC_ATTR, type SelectionContext, type SourceLoc } from '../../shared/contracts.js';
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
  ancestors: string[];
}

function probe(selector: string): string {
  return `(() => {
    let el;
    try { el = document.querySelector(${JSON.stringify(selector)}); } catch { return null; }
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const styles = {};
    for (const key of ${JSON.stringify(STYLE_KEYS)}) styles[key] = cs.getPropertyValue(key);
    const ancestors = [];
    for (let p = el.parentElement; p && ancestors.length < 6; p = p.parentElement) ancestors.push(p.tagName.toLowerCase() + (p.id ? '#' + p.id : ''));
    return { tag: el.tagName.toLowerCase(), text: (el.textContent || '').trim().slice(0, 2000), outerHTML: el.outerHTML.slice(0, 10000), styles, rect: { x: Math.round(r.x), y: Math.round(r.y + scrollY), width: Math.round(r.width), height: Math.round(r.height) }, loc: el.getAttribute(${JSON.stringify(SOURCE_LOC_ATTR)}), ancestors };
  })()`;
}

function parseLoc(raw: string | null): SourceLoc | null {
  const match = raw ? /^(.+):(\d+):(\d+)$/.exec(raw) : null;
  return match ? { file: match[1] as string, line: Number(match[2]), col: Number(match[3]) } : null;
}

export async function describeElement(preview: PreviewService, url: string, selector: string): Promise<SelectionContext | null> {
  if (!preview.withPage) throw new Error('rendering is not available');
  const raw = await preview.withPage(url, { width: 1440, height: 900 }, async (page) => {
    await waitForPage(page);
    return page.evaluate<RawElement | null>(probe(selector));
  });
  if (!raw) return null;
  return { selector, tag: raw.tag, text: raw.text, outerHTML: raw.outerHTML, styles: raw.styles, rect: raw.rect, source: parseLoc(raw.loc), ancestors: raw.ancestors };
}
