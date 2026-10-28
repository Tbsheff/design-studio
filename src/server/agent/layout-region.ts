import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { QualityFinding } from '../../shared/contracts.js';
import type { PreviewService } from '../types.js';

export interface LayoutBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutRegion {
  main: string;
  mainBox: LayoutBox;
  column: string | null;
  columnBox: LayoutBox | null;
  owners: string[];
  outside: Record<string, number>;
  contentWidth?: number;
  rows?: string[];
  cards?: LayoutCard[];
}

export interface LayoutCard {
  name: string;
  box: LayoutBox;
  rows: string[];
}

export interface PageOwner {
  name: string;
  file: string;
  hasMain: boolean;
}

const DESKTOP = { width: 1440, height: 900 };
const PROBE_TIMEOUT_MS = 20_000;

const LAYOUT_EXPRESSION = `(() => {
  const SKIP = new Set(['SCRIPT', 'STYLE', 'LINK', 'NOSCRIPT', 'TEMPLATE', 'META']);
  const box = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY), width: Math.round(r.width), height: Math.round(r.height) }; };
  const area = (el) => { const r = el.getBoundingClientRect(); return r.width * r.height; };
  const shown = (el) => {
    if (SKIP.has(el.tagName)) return false;
    const s = getComputedStyle(el);
    return area(el) >= 400 && s.display !== 'none' && s.visibility !== 'hidden' && s.position !== 'fixed';
  };
  const name = (el) => {
    const cls = [...el.classList].filter((c) => /^[\\w-]+$/.test(c)).slice(0, 4);
    return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + cls.map((c) => '.' + c).join('');
  };
  const main = [...document.querySelectorAll('main, [role=main]')].filter(shown).sort((a, b) => area(b) - area(a))[0];
  if (!main) return null;
  let column = main;
  for (let step = 0; step < 6; step++) {
    const kids = [...column.children].filter(shown).sort((a, b) => area(b) - area(a));
    const big = kids[0];
    if (!big) break;
    if (kids.length === 1) { column = big; continue; }
    if (area(big) >= 0.6 * area(column)) column = big;
    break;
  }
  const owners = [];
  const fiberKey = Object.keys(main).find((key) => key.startsWith('__reactFiber$'));
  let owner = fiberKey ? main[fiberKey]?._debugOwner : null;
  while (owner && owners.length < 4) {
    const type = owner.type && typeof owner.type !== 'string' ? owner.type : null;
    const label = owner.name || type?.displayName || type?.name;
    if (typeof label === 'string' && label && !owners.includes(label)) owners.push(label);
    owner = owner._debugOwner;
  }
  const outside = {};
  for (let node = main; node && node !== document.documentElement; node = node.parentElement) {
    const parent = node.parentElement;
    if (!parent) break;
    for (const sibling of parent.children) {
      if (sibling === node || !shown(sibling)) continue;
      const key = name(sibling);
      outside[key] = (outside[key] || 0) + 1;
    }
  }
  const norm = (text) => text.replace(/\\s+/g, ' ').trim();
  const ownText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
  const rowsOf = (root, max) => [...root.querySelectorAll('*')].filter((el) => ownText(el) && el.getClientRects().length).map((el) => norm(el.innerText || '')).filter((t) => t.length >= 2 && t.length <= 160).slice(0, max);
  const cardLike = (el) => { const s = getComputedStyle(el); return el.dataset.slot === 'card' || (s.boxShadow !== 'none' && area(el) > 4000) || (parseFloat(s.borderTopWidth) > 0 && parseFloat(s.borderLeftWidth) > 0 && parseFloat(s.borderTopLeftRadius) > 0 && area(el) > 4000); };
  const cards = [...main.querySelectorAll('*')].filter((el) => shown(el) && cardLike(el)).slice(0, 60).map((el) => ({ name: name(el), box: box(el), rows: rowsOf(el, 40) })).filter((c) => c.rows.length);
  const holder = column === main ? main : column;
  const hs = getComputedStyle(holder);
  const contentWidth = Math.round(holder.getBoundingClientRect().width - parseFloat(hs.paddingLeft) - parseFloat(hs.paddingRight));
  return { main: name(main), mainBox: box(main), column: column === main ? null : name(column), columnBox: column === main ? null : box(column), owners, outside, contentWidth, rows: rowsOf(main, 800), cards };
})()`;

function withTimeout<T>(task: Promise<T>, ms: number): Promise<T | null> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ms);
  });
  return Promise.race([task, timeout]).finally(() => clearTimeout(timer));
}

export async function probeLayout(preview: PreviewService, url: string): Promise<LayoutRegion | null> {
  if (!preview.withPage) return null;
  const run = preview.withPage(url, DESKTOP, (page) => page.evaluate<LayoutRegion | null>(LAYOUT_EXPRESSION));
  return withTimeout(run.catch(() => null), PROBE_TIMEOUT_MS);
}

const JSX_ROOT = /return\s*\(?\s*<([A-Z][\w.]*)/;

function importPath(source: string, name: string): string | null {
  const named = new RegExp(`import\\s*(?:\\w+\\s*,\\s*)?\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s*["']([^"']+)["']`);
  const fallback = new RegExp(`import\\s+${name}\\s*(?:,[^;]*)?from\\s*["']([^"']+)["']`);
  return named.exec(source)?.[1] ?? fallback.exec(source)?.[1] ?? null;
}

async function readFirst(workTree: string, base: string): Promise<{ file: string; text: string } | null> {
  for (const suffix of ['', '.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts', '/index.jsx', '/index.js']) {
    const file = `${base}${suffix}`;
    const text = await readFile(path.join(workTree, file), 'utf8').catch(() => null);
    if (text !== null) return { file, text };
  }
  return null;
}

export async function pageOwner(workTree: string, routeFile: string): Promise<PageOwner | null> {
  const source = await readFile(path.join(workTree, routeFile), 'utf8').catch(() => null);
  if (!source || /<main\b/.test(source)) return null;
  const name = JSX_ROOT.exec(source)?.[1]?.split('.')[0];
  const spec = name ? importPath(source, name) : null;
  if (!name || !spec?.startsWith('.')) return null;
  const found = await readFirst(workTree, path.posix.join(path.posix.dirname(routeFile), spec));
  return found ? { name, file: found.file, hasMain: /<main\b/.test(found.text) } : null;
}

function regionText(region: LayoutRegion): string {
  const b = region.columnBox ?? region.mainBox;
  const column = region.column ? ` > ${region.column}` : '';
  return `${region.main}${column} (${b.width}x${b.height} at ${b.x},${b.y} on desktop)`;
}

export function layoutLines(region: LayoutRegion | null | undefined, owner: PageOwner | null | undefined, routeFile: string | null): string[] {
  const lines: string[] = [];
  if (region) lines.push(`main content region: ${regionText(region)}${region.owners.length ? `, rendered by <${region.owners[0]}>` : ''}. New UI goes inside it, in the section it belongs to, never above or beside the element that holds <main>.`);
  if (owner) lines.push(`page content owner: <${owner.name}> in ${owner.file}${owner.hasMain ? ' (it renders <main>)' : ''}. ${routeFile ?? 'The route file'} only renders it, so edit ${owner.file}, not the route file.`);
  return lines;
}

function addedOutside(before: Record<string, number>, after: Record<string, number>): string[] {
  return Object.entries(after).flatMap(([key, count]) => (count > (before[key] ?? 0) ? [key] : []));
}

export function outsideFindings(baseline: LayoutRegion | null, now: LayoutRegion | null, owner: PageOwner | null | undefined): QualityFinding[] {
  if (!baseline || !now) return [];
  const into = owner ? ` in ${owner.file} (<${owner.name}>)` : '';
  return addedOutside(baseline.outside, now.outside).slice(0, 3).map((element) => ({
    check: 'outside-layout',
    severity: 'high',
    viewport: 'desktop',
    selector: element,
    source: null,
    message: `New element ${element} renders outside the main layout box ${regionText(now)}. It sits above or beside the app layout, not in the page content.`,
    fix: `Move it inside ${now.column ?? now.main}${into}, in the section it belongs to.`,
  }));
}
