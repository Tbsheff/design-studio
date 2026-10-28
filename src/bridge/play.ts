import { isIdSelector, LINKS_MAX, LINK_SELECTOR_MAX, textAgrees, type LinkQuery, type LinkRectReport } from '../shared/links.js';
import type { PlayKey } from '../shared/contracts.js';

type Rect = NonNullable<LinkRectReport['rect']>;

interface PlayPost {
  (body: { type: 'link-rects'; links: LinkRectReport[] }): void;
  (body: { type: 'play-click'; id: string }): void;
  (body: { type: 'play-key'; key: PlayKey }): void;
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
    for (const query of playing) {
      const element = resolveLink(query);
      if (element && element.contains(target)) return query;
    }
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
      post({ type: 'play-click', id: query.id });
      return true;
    },
    onKeyDown(event) {
      if (!playing || event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target instanceof Element ? event.target : null)) return false;
      const key: PlayKey | null = event.key === 'Escape' ? 'exit' : event.key === 'r' || event.key === 'R' ? 'restart' : event.key === 'Backspace' ? 'back' : null;
      if (!key) return false;
      event.preventDefault();
      event.stopImmediatePropagation();
      post({ type: 'play-key', key });
      return true;
    },
  };
}
