import { APP_SOURCE_PATH, DEV_CHROME_SELECTOR } from '../../shared/app.js';
import { SOURCE_LOC_ATTR } from '../../shared/contracts.js';
import { LAYER_REF, layerKey } from '../../shared/layer-ref.js';
import { onSourceChange } from '../direct-edit/change-feed.js';
import type { PreviewService } from '../types.js';
import { refForKey, remapIds } from './layer-ids.js';
import { onProbePage } from '../preview/probe-page.js';

export interface Viewport {
  width: number;
  height: number;
}

export interface RawLayer {
  parent: number;
  depth: number;
  tag: string;
  path: string;
  nth: number;
  sib: number;
  own: string | null;
  used: string | null;
  comp: string | null;
  text: string;
  childCount: number;
  hidden: boolean;
}

export interface Layer extends RawLayer {
  ref: string;
  key: string;
}

interface ScanInput {
  root: string | null;
  depth: number;
  max: number;
  paths: string[] | null;
  all: boolean;
}

interface ScanResult {
  layers: RawLayer[];
  truncated: boolean;
  missingRoot: boolean;
  roots: number[] | null;
}

type ScanPage = { evaluate<T>(expression: string): Promise<T> };

interface Memo {
  key: string;
  path: string;
  page: string | undefined;
}

const MEMO_MAX = 20000;
const memo = new Map<string, Memo>();

const SCAN_SOURCE = String.raw`async (input) => {
  const LOC = ${JSON.stringify(SOURCE_LOC_ATTR)};
  const SKIP = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT', 'LINK', 'META', 'BASE', 'TITLE', 'NEXTJS-PORTAL']);
  const CHROME = ${JSON.stringify(DEV_CHROME_SELECTOR)};
  const layer = (el) => !SKIP.has(el.tagName) && !(el.id || '').startsWith('studio-') && !el.matches(CHROME);
  const kids = (el) => el.tagName === 'svg' || el.tagName === 'SVG' ? [] : [...el.children].filter(layer);
  const fiberOf = (node) => { const key = Object.keys(node).find((k) => k.startsWith('__reactFiber$')); return key ? node[key] : null; };
  const stackOf = (f) => [f?._debugStack?.stack, f?.debugStack?.stack, f?.stack].find((v) => typeof v === 'string' && v.length > 0) || '';
  const nameOf = (owner) => { const type = owner?.type; return (typeof owner?.name === 'string' ? owner.name : type?.displayName || type?.render?.displayName || type?.render?.name || type?.type?.displayName || type?.type?.name || type?.name) || null; };
  const raw = new Map();
  const rawOf = (el) => {
    let found = raw.get(el);
    if (found) return found;
    const tagged = el.getAttribute(LOC);
    if (tagged) found = { tagged, own: '', owner: '', ownerRef: null, group: 't' + tagged };
    else {
      const fiber = fiberOf(el);
      const owner = fiber?._debugOwner || null;
      const own = stackOf(fiber);
      const ownerStack = stackOf(owner);
      found = { tagged: null, own, owner: ownerStack, ownerRef: owner, group: own || ownerStack ? own + '\u0001' + ownerStack : null };
    }
    raw.set(el, found);
    return found;
  };
  const nth = new Map();
  const counts = new Map();
  for (const el of document.body.querySelectorAll('*')) {
    const group = rawOf(el).group;
    if (!group) continue;
    const n = counts.get(group) || 0;
    counts.set(group, n + 1);
    nth.set(el, n);
  }
  const pathOf = (el) => {
    const parts = [];
    for (let node = el; node && node.parentElement && node !== document.body; node = node.parentElement) parts.unshift(node.tagName.toLowerCase() + ':nth-child(' + ([...node.parentElement.children].indexOf(node) + 1) + ')');
    return ['body', ...parts].join(' > ');
  };
  const sibOf = (el) => el.parentElement ? [...el.parentElement.children].filter((c) => c.tagName === el.tagName).indexOf(el) : 0;
  const textOf = (el) => {
    let own = '';
    for (const node of el.childNodes) if (node.nodeType === 3) own += node.textContent;
    if (!own.trim() && el.children.length === 0) own = el.textContent || el.getAttribute('aria-label') || el.getAttribute('alt') || el.getAttribute('placeholder') || '';
    own = own.replace(/\s+/g, ' ').trim();
    return own.length > 40 ? own.slice(0, 39) + '…' : own;
  };
  const picked = [];
  const index = new Map();
  const add = (el, depth) => {
    if (index.has(el)) return index.get(el);
    const parentEl = el.parentElement && el.parentElement !== document.documentElement ? el.parentElement : null;
    const parent = parentEl && parentEl !== document.body ? add(parentEl, -1) : -1;
    const at = picked.length;
    picked.push({ el, parent, depth });
    index.set(el, at);
    return at;
  };
  let rootEl = document.body;
  let truncated = false;
  let roots = null;
  if (input.paths) {
    roots = input.paths.map((p) => {
      let el = null;
      try { el = p ? document.querySelector(p) : null; } catch {}
      if (!el) return -1;
      const at = add(el, 0);
      picked[at].depth = 0;
      return at;
    });
  } else if (input.all) {
    for (const el of document.body.querySelectorAll('*')) if (layer(el)) add(el, 0);
  } else {
    if (input.root) {
      try { rootEl = document.querySelector(input.root); } catch { rootEl = null; }
      if (!rootEl) return { layers: [], truncated: false, missingRoot: true };
    }
    const stack = (rootEl === document.body ? kids(document.body).reverse() : [rootEl]).map((el) => ({ el, depth: 0 }));
    let shown = 0;
    while (stack.length > 0) {
      if (shown >= input.max) { truncated = true; break; }
      const { el, depth } = stack.pop();
      shown += 1;
      const at = add(el, depth);
      picked[at].depth = depth;
      if (depth >= input.depth) continue;
      const children = kids(el);
      for (let i = children.length - 1; i >= 0; i -= 1) stack.push({ el: children[i], depth: depth + 1 });
    }
  }
  const stacks = [];
  const seen = new Map();
  const want = (stack) => { if (stack && !seen.has(stack)) { seen.set(stack, stacks.length); stacks.push(stack); } };
  for (const p of picked) { const r = rawOf(p.el); if (!r.tagged) { want(r.own); want(r.owner); } }
  const sources = new Array(stacks.length).fill(null);
  const chunks = [];
  for (let i = 0; i < stacks.length; i += 20) chunks.push(i);
  await Promise.all(chunks.map(async (start) => {
    try {
      const res = await fetch(${JSON.stringify(APP_SOURCE_PATH)}, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ stacks: stacks.slice(start, start + 20) }), cache: 'no-store' });
      const body = res.ok ? await res.json() : null;
      (Array.isArray(body?.sources) ? body.sources : []).forEach((s, k) => { sources[start + k] = typeof s === 'string' ? s : null; });
    } catch {}
  }));
  const HOST = new Set([5, 26, 27]);
  const rootOf = (el, owner) => {
    for (let f = fiberOf(el)?.return; f; f = f.return) {
      if (f === owner || f === owner.alternate) return true;
      if (HOST.has(f.tag)) return false;
    }
    return false;
  };
  const srcOf = (stack) => stack && seen.has(stack) ? sources[seen.get(stack)] : null;
  const file = (value) => String(value).replace(/:\d+:\d+$/, '');
  const layers = picked.map(({ el, parent, depth }) => {
    const r = rawOf(el);
    const own = r.tagged || srcOf(r.own) || srcOf(r.owner);
    const usedRaw = r.tagged ? null : srcOf(r.owner);
    const used = own && usedRaw && file(own) !== file(usedRaw) ? usedRaw : null;
    let parentEl = el.parentElement;
    while (parentEl && parentEl !== document.body && !fiberOf(parentEl)) parentEl = parentEl.parentElement;
    const rootOfOwner = r.ownerRef && (typeof r.ownerRef.tag === 'number' ? rootOf(el, r.ownerRef) : !parentEl || parentEl === document.body || (fiberOf(parentEl)?._debugOwner || null) !== r.ownerRef);
    return { parent, depth, tag: el.tagName.toLowerCase(), path: pathOf(el), nth: nth.get(el) || 0, sib: sibOf(el), own: own || null, used, comp: rootOfOwner ? nameOf(r.ownerRef) : null, text: depth >= 0 ? textOf(el) : '', childCount: kids(el).length, hidden: el.getClientRects().length === 0 };
  });
  return { layers, truncated, missingRoot: false, roots };
}`;

export function scopeOf(projectId: string, directionId: string): string {
  return `${projectId}/${directionId}`;
}

export function isLayerRef(value: unknown): value is string {
  return typeof value === 'string' && LAYER_REF.test(value.trim());
}

function keyed(raws: RawLayer[], scope: string): Layer[] {
  const keys: string[] = [];
  const seen = new Map<string, number>();
  return raws.map((raw, index) => {
    const parentKey = raw.parent >= 0 ? (keys[raw.parent] as string) : 'body';
    const base = raw.own ? layerKey(raw.own, raw.used, raw.nth) : `${parentKey}/${raw.tag}:${raw.sib}`;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    const key = count === 0 ? base : `${base}~${count}`;
    keys[index] = key;
    return { ...raw, key, ref: refForKey(scope, key) };
  });
}

function scanIn(page: ScanPage, input: ScanInput): Promise<ScanResult> {
  return page.evaluate<ScanResult>(`(${SCAN_SOURCE})(${JSON.stringify(input)})`);
}

async function onPage<T>(preview: PreviewService, url: string, viewport: Viewport, task: (page: ScanPage) => Promise<T>): Promise<T> {
  return onProbePage(preview, url, viewport, task);
}

function remember(scope: string, page: string | undefined, layers: Layer[]): void {
  if (memo.size > MEMO_MAX) memo.clear();
  for (const layer of layers) memo.set(`${scope}|${layer.ref}`, { key: layer.key, path: layer.path, page });
}

onSourceChange((change) => {
  const scope = scopeOf(change.projectId, change.directionId);
  for (const move of remapIds(scope, change.files)) {
    const known = memo.get(`${scope}|${move.ref}`);
    if (!known) continue;
    if (move.to === null) memo.delete(`${scope}|${move.ref}`);
    else memo.set(`${scope}|${move.ref}`, { ...known, key: move.to });
  }
});

export function memoPage(scope: string, ref: string): string | undefined {
  return memo.get(`${scope}|${ref}`)?.page;
}

export async function scanLayers(preview: PreviewService, url: string, viewport: Viewport, scope: string, page: string | undefined, options: { root: string | null; depth: number; max: number }): Promise<{ layers: Layer[]; truncated: boolean } | null> {
  const found = await onPage(preview, url, viewport, (page) => scanIn(page, { ...options, paths: null, all: false }));
  if (found.missingRoot) return null;
  const layers = keyed(found.layers, scope);
  remember(scope, page, layers);
  return { layers, truncated: found.truncated };
}

export class LayerRefError extends Error {}

function quickHits(scope: string, refs: string[], found: ScanResult): Map<string, string> {
  const layers = keyed(found.layers, scope);
  const hits = new Map<string, string>();
  refs.forEach((ref, index) => {
    const at = found.roots?.[index] ?? -1;
    const layer = at >= 0 ? layers[at] : undefined;
    if (layer?.ref === ref) hits.set(ref, layer.path);
  });
  return hits;
}

function refError(ref: string, count: number, page: string | undefined): LayerRefError {
  if (count > 1) return new LayerRefError(`Layer id ${ref} matches ${count} elements on this page. Call get_layers again and use a CSS selector for this element.`);
  return new LayerRefError(`No element with layer id ${ref} on this page${page ? ` (${page})` : ''}. It was removed, or it is on another page, or the file changed outside the studio: call get_layers again for fresh ids.`);
}

export async function resolveLayerRefs(preview: PreviewService, url: string, viewport: Viewport, scope: string, refs: string[]): Promise<Map<string, string>> {
  const wanted = [...new Set(refs)];
  const known = wanted.map((ref) => memo.get(`${scope}|${ref}`));
  return onPage(preview, url, viewport, async (page) => {
    const hits = quickHits(scope, wanted, await scanIn(page, { root: null, depth: 0, max: 0, paths: known.map((item) => item?.path ?? ''), all: false }));
    const missing = wanted.filter((ref) => !hits.has(ref));
    if (missing.length === 0) return hits;
    const all = keyed((await scanIn(page, { root: null, depth: 0, max: 0, paths: null, all: true })).layers, scope);
    for (const ref of missing) {
      const found = all.filter((layer) => layer.ref === ref);
      const page = known[wanted.indexOf(ref)]?.page;
      if (found.length !== 1) throw refError(ref, found.length, page);
      remember(scope, page, found);
      hits.set(ref, (found[0] as Layer).path);
    }
    return hits;
  });
}

export async function resolveLayerRef(preview: PreviewService, url: string, viewport: Viewport, scope: string, ref: string): Promise<string> {
  return (await resolveLayerRefs(preview, url, viewport, scope, [ref])).get(ref) as string;
}

export interface PathMatch<T> {
  layers: (Layer | null)[];
  extra: T;
}

export async function layersAtPaths<T>(preview: PreviewService, url: string, viewport: Viewport, scope: string, page: string | undefined, find: (probe: ScanPage) => Promise<{ paths: string[]; extra: T }>): Promise<PathMatch<T>> {
  return onPage(preview, url, viewport, async (probe) => {
    const found = await find(probe);
    if (found.paths.length === 0) return { layers: [], extra: found.extra };
    const scan = await scanIn(probe, { root: null, depth: 0, max: 0, paths: found.paths, all: false });
    const layers = keyed(scan.layers, scope);
    const picked = found.paths.map((_, index) => {
      const at = scan.roots?.[index] ?? -1;
      return at >= 0 ? (layers[at] ?? null) : null;
    });
    remember(scope, page, picked.filter((layer): layer is Layer => layer !== null));
    return { layers: picked, extra: found.extra };
  });
}
