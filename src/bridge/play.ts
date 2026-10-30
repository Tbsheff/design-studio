import { isIdSelector, LINKS_MAX, LINK_SELECTOR_MAX, textAgrees, type LinkQuery, type LinkRectReport } from '../shared/links.js';
import type { PlayKey } from '../shared/contracts.js';

type Rect = NonNullable<LinkRectReport['rect']>;

interface PlayPost {
  (body: { type: 'link-rects'; links: LinkRectReport[] }): void;
  (body: { type: 'play-click'; id: string }): void;
  (body: { type: 'play-key'; key: PlayKey }): void;
  (body: { type: 'play-layers'; layers: Record<string, Rect> }): void;
}

const LAYER_SCAN_MAX = 600;
const LAYER_TEXT_MAX = 60;

function ownText(element: Element): string {
  let text = '';
  for (const node of Array.from(element.childNodes)) if (node.nodeType === Node.TEXT_NODE) text += node.textContent ?? '';
  return text.replace(/\s+/g, ' ').trim();
}

function layerKey(element: Element): string | null {
  if (element.id) return `#${element.id}`;
  const named = element.getAttribute('data-layer') ?? element.getAttribute('data-name');
  if (named) return `@${named}`;
  const tag = element.tagName.toLowerCase();
  if (tag === 'img') return `img:${element.getAttribute('src') ?? ''}`;
  const text = ownText(element);
  return text && text.length <= LAYER_TEXT_MAX ? `${tag}:${text.toLowerCase()}` : null;
}

function layerMap(): Map<string, Element> {
  const found = new Map<string, Element | null>();
  const all = document.body ? Array.from(document.body.querySelectorAll('*')).slice(0, LAYER_SCAN_MAX) : [];
  for (const element of all) {
    const key = layerKey(element);
    if (!key) continue;
    const r = element.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    found.set(key, found.has(key) ? null : element);
  }
  const out = new Map<string, Element>();
  for (const [key, element] of found) if (element) out.set(key, element);
  return out;
}

export function layerRects(): Record<string, Rect> {
  const out: Record<string, Rect> = {};
  for (const [key, element] of layerMap()) out[key] = rectOf(element);
  return out;
}

function hasMatchedAncestor(element: Element, matched: Set<Element>): boolean {
  for (let parent = element.parentElement; parent; parent = parent.parentElement) if (matched.has(parent)) return true;
  return false;
}

function isRect(value: unknown): value is Rect {
  const r = value as Partial<Rect> | null;
  return !!r && typeof r.x === 'number' && typeof r.y === 'number' && typeof r.width === 'number' && typeof r.height === 'number';
}

function moveFrom(element: Element, before: Rect, timing: KeyframeAnimationOptions): void {
  const after = rectOf(element);
  if (after.width === 0 || after.height === 0) return;
  const dx = before.x - after.x;
  const dy = before.y - after.y;
  const sx = before.width / after.width;
  const sy = before.height / after.height;
  const text = ownText(element) !== '';
  if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && (text || (Math.abs(sx - 1) < 0.01 && Math.abs(sy - 1) < 0.01))) return;
  const from = text ? `translate(${dx}px, ${dy}px)` : `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
  element.animate([{ transformOrigin: '0 0', transform: from }, { transformOrigin: '0 0', transform: 'none' }], timing);
  if (text && (Math.abs(sx - 1) > 0.01 || Math.abs(sy - 1) > 0.01)) element.animate([{ opacity: 0.35 }, { opacity: 1 }], timing);
}

export function smartAnimate(raw: unknown, durationRaw: unknown, easingRaw: unknown): number {
  if (typeof Element.prototype.animate !== 'function' || !raw || typeof raw !== 'object') return 0;
  const before = raw as Record<string, unknown>;
  const duration = typeof durationRaw === 'number' && durationRaw > 0 ? Math.min(durationRaw, 3000) : 320;
  const easing = typeof easingRaw === 'string' && /^[a-z(),.\s\d-]{1,60}$/.test(easingRaw) ? easingRaw : 'ease-out';
  const timing: KeyframeAnimationOptions = { duration, easing, fill: 'backwards' };
  const now = layerMap();
  const matched = new Set<Element>();
  for (const [key, element] of now) if (isRect(before[key])) matched.add(element);
  let moved = 0;
  for (const [key, element] of now) {
    if (hasMatchedAncestor(element, matched)) continue;
    const old = before[key];
    if (matched.has(element) && isRect(old)) {
      moveFrom(element, old, timing);
      moved += 1;
    } else element.animate([{ opacity: 0 }, { opacity: 1 }], timing);
  }
  return moved;
}

function isLinkQuery(value: unknown): value is LinkQuery {
  if (typeof value !== 'object' || value === null) return false;
  const query = value as Partial<LinkQuery>;
  return (
    typeof query.id === 'string' &&
    typeof query.selector === 'string' &&
    query.selector.length <= LINK_SELECTOR_MAX &&
    (query.tag === undefined || typeof query.tag === 'string') &&
    (query.text === undefined || typeof query.text === 'string')
  );
}

export function linkQueries(raw: unknown): LinkQuery[] {
  return Array.isArray(raw) ? raw.filter(isLinkQuery).slice(0, LINKS_MAX) : [];
}

function safeQuery(selector: string): Element | null {
  try {
    return document.querySelector(selector);
  } catch {
    return null;
  }
}

function visibleText(element: Element): string {
  return element instanceof HTMLElement ? element.innerText : (element.textContent ?? '');
}

function closestLink(query: LinkQuery, target: Element): Element | null {
  let found: Element | null = null;
  try {
    found = target.closest(query.selector);
  } catch {
    return null;
  }
  const tag = query.tag?.toLowerCase();
  if (!found || (tag && found.tagName.toLowerCase() !== tag)) return null;
  return isIdSelector(query.selector) || textAgrees(visibleText(found), query.text) ? found : null;
}

export function resolveLink(query: LinkQuery): Element | null {
  const tag = query.tag?.toLowerCase();
  const found = safeQuery(query.selector);
  const tagOk = found !== null && (!tag || found.tagName.toLowerCase() === tag);
  if (found && tagOk && (isIdSelector(query.selector) || textAgrees(visibleText(found), query.text))) return found;
  if (!tag || !query.text || !/^[a-z][a-z0-9-]*$/.test(tag)) return null;
  return Array.from(document.getElementsByTagName(tag)).find((element) => textAgrees(visibleText(element), query.text)) ?? null;
}

function rectOf(element: Element): Rect {
  const r = element.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
}

function isTyping(element: Element | null): boolean {
  if (!element) return false;
  if (element instanceof HTMLElement && element.isContentEditable) return true;
  const tag = element.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select';
}

export interface LinkBridge {
  track(raw: unknown): void;
  play(raw: unknown): void;
  schedule(): void;
  onClick(event: MouseEvent): boolean;
  onKeyDown(event: KeyboardEvent): boolean;
  fx(message: { layers: unknown; duration: unknown; easing: unknown }): void;
}

export function createLinkBridge(post: PlayPost): LinkBridge {
  let tracked: LinkQuery[] = [];
  let playing: LinkQuery[] | null = null;
  let frame = 0;
  let last = '';
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => schedule()) : null;

  const send = (): void => {
    frame = 0;
    const elements = tracked.map(resolveLink);
    observer?.disconnect();
    if (observer && tracked.length > 0) {
      observer.observe(document.documentElement);
      for (const element of elements) if (element) observer.observe(element);
    }
    const links = tracked.map((query, index) => {
      const element = elements[index];
      return { id: query.id, rect: element ? rectOf(element) : null };
    });
    const text = JSON.stringify(links);
    if (text === last) return;
    last = text;
    post({ type: 'link-rects', links });
  };

  function schedule(): void {
    if (tracked.length === 0 || frame) return;
    frame = window.requestAnimationFrame(send);
  }

  const linkAt = (target: EventTarget | null): LinkQuery | null => {
    if (!playing || !(target instanceof Element)) return null;
    for (const query of playing) if (closestLink(query, target)) return query;
    for (const query of playing) if (resolveLink(query)?.contains(target)) return query;
    return null;
  };

  return {
    track(raw) {
      tracked = linkQueries(raw);
      last = '';
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      send();
    },
    play(raw) {
      playing = raw === null ? null : linkQueries(raw);
    },
    schedule,
    onClick(event) {
      const query = linkAt(event.target);
      if (!query) return false;
      event.preventDefault();
      event.stopImmediatePropagation();
      post({ type: 'play-layers', layers: layerRects() });
      post({ type: 'play-click', id: query.id });
      return true;
    },
    fx(message) {
      smartAnimate(message.layers, message.duration, message.easing);
    },
    onKeyDown(event) {
      if (!playing || event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target instanceof Element ? event.target : null)) return false;
      const key: PlayKey | null = event.key === 'Escape' ? 'exit' : event.key === 'r' || event.key === 'R' ? 'restart' : event.key === 'Backspace' ? 'back' : null;
      if (!key) return false;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (key === 'back') post({ type: 'play-layers', layers: layerRects() });
      post({ type: 'play-key', key });
      return true;
    },
  };
}
