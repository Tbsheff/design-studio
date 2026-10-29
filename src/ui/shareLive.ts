import { STUDIO_TOKEN_HEADER } from '../shared/contracts';
import type { BridgeFrame } from './bridge';
import type { SharePresenceCursor, SharePresenceEvent, StudioCursorInput } from '../shared/share';
import { getSession } from './session';
import { SHARES_CHANGED } from './shareApi';
import { onSharePointer, setSharePointer } from './tokenFrames';
import './styles/share-live.css';

const RETRY_MS = 5000;
const SEND_MS = 50;
const FRAME_SELECTOR = '.artboard[data-frame-id], .canvas-frame[data-frame-id]';

const ARROW = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1 1l5.5 13 2-5.5L14 6.5z" fill="currentColor" stroke="white" stroke-width="1.2" stroke-linejoin="round"/></svg>';

function hueOf(id: string): number {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

function frameEl(stage: HTMLElement, frameId: string): HTMLElement | null {
  return stage.querySelector<HTMLElement>(`.artboard[data-frame-id="${CSS.escape(frameId)}"], .canvas-frame[data-frame-id="${CSS.escape(frameId)}"]`);
}

function authHeaders(): Record<string, string> {
  return { [STUDIO_TOKEN_HEADER]: getSession().token };
}

async function readEvents(res: Response, onEvent: (event: SharePresenceEvent) => void): Promise<void> {
  const reader = res.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buffer += decoder.decode(value, { stream: true });
    let cut = buffer.indexOf('\n\n');
    while (cut >= 0) {
      const block = buffer.slice(0, cut);
      buffer = buffer.slice(cut + 2);
      cut = buffer.indexOf('\n\n');
      if (/^event: ping/m.test(block)) continue;
      const data = block
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart())
        .join('\n');
      if (data) onEvent(JSON.parse(data) as SharePresenceEvent);
    }
  }
}

class CursorLayer {
  private layer: HTMLDivElement | null = null;
  private nodes = new Map<string, HTMLDivElement>();
  private raf = 0;
  readonly cursors = new Map<string, SharePresenceCursor>();

  constructor(private stage: () => HTMLElement | null) {}

  set(list: SharePresenceCursor[]): void {
    this.cursors.clear();
    for (const c of list) this.cursors.set(`${c.linkId}:${c.viewer}`, c);
    this.kick();
  }

  put(cursor: SharePresenceCursor): void {
    this.cursors.set(`${cursor.linkId}:${cursor.viewer}`, cursor);
    this.kick();
  }

  drop(linkId: string, viewer: string): void {
    this.cursors.delete(`${linkId}:${viewer}`);
    this.kick();
  }

  destroy(): void {
    window.cancelAnimationFrame(this.raf);
    this.layer?.remove();
    this.layer = null;
    this.nodes.clear();
  }

  private kick(): void {
    if (!this.raf) this.raf = window.requestAnimationFrame(() => this.paint());
  }

  private host(stage: HTMLElement): HTMLDivElement {
    if (this.layer && this.layer.parentElement === stage) return this.layer;
    this.layer?.remove();
    const layer = document.createElement('div');
    layer.className = 'share-cursors';
    layer.setAttribute('aria-hidden', 'true');
    stage.append(layer);
    this.layer = layer;
    this.nodes.clear();
    return layer;
  }

  private node(key: string, cursor: SharePresenceCursor, layer: HTMLDivElement): HTMLDivElement {
    let el = this.nodes.get(key);
    if (!el) {
      el = document.createElement('div');
      el.className = 'share-cursor';
      el.dataset.testid = 'share-viewer-cursor';
      el.innerHTML = ARROW;
      el.append(document.createElement('span'));
      el.style.setProperty('--cursor-hue', String(hueOf(cursor.viewer)));
      layer.append(el);
      this.nodes.set(key, el);
    }
    const label = el.querySelector('span') as HTMLSpanElement;
    if (label.textContent !== cursor.name) label.textContent = cursor.name;
    return el;
  }

  private place(el: HTMLDivElement, cursor: SharePresenceCursor, stage: HTMLElement, box: DOMRect): void {
    const frame = cursor.frameId ? frameEl(stage, cursor.frameId) : cursor.frame === 0 ? stage.querySelector<HTMLElement>('.artboard[data-frame-id]') : null;
    if (!frame || frame.offsetWidth === 0) {
      el.hidden = true;
      return;
    }
    const r = frame.getBoundingClientRect();
    const scale = r.width / frame.offsetWidth;
    const below = cursor.y > frame.offsetHeight;
    el.hidden = false;
    el.classList.toggle('below', below);
    el.style.transform = `translate(${r.left - box.left + Math.min(cursor.x, frame.offsetWidth) * scale}px, ${r.top - box.top + Math.min(cursor.y, frame.offsetHeight) * scale}px)`;
  }

  private paint(): void {
    this.raf = 0;
    const stage = this.stage();
    if (!stage || this.cursors.size === 0) {
      this.layer?.remove();
      this.layer = null;
      this.nodes.clear();
      return;
    }
    const layer = this.host(stage);
    const box = stage.getBoundingClientRect();
    for (const [key, el] of this.nodes) {
      if (!this.cursors.has(key)) {
        el.remove();
        this.nodes.delete(key);
      }
    }
    for (const [key, cursor] of this.cursors) this.place(this.node(key, cursor, layer), cursor, stage, box);
    this.raf = window.requestAnimationFrame(() => this.paint());
  }
}

function studioPointer(projectId: string, stage: () => HTMLElement | null) {
  let on = false;
  let pending: StudioCursorInput | null | undefined;
  let timer = 0;
  let lastFrame: string | null = null;
  const flush = () => {
    timer = 0;
    if (pending === undefined) return;
    const body = pending ?? { frameId: null, x: 0, y: 0 };
    pending = undefined;
    void fetch(`/api/projects/${encodeURIComponent(projectId)}/share-cursor`, { method: 'PUT', headers: { ...authHeaders(), 'content-type': 'application/json' }, body: JSON.stringify(body) }).catch(() => undefined);
  };
  const queue = (value: StudioCursorInput | null) => {
    pending = value;
    if (!timer) timer = window.setTimeout(flush, SEND_MS);
  };
  const at = (from: Element | null, clientX: number, clientY: number) => {
    const root = stage();
    const target = from?.closest<HTMLElement>(FRAME_SELECTOR) ?? null;
    if (!root || !target || !root.contains(target) || target.offsetWidth === 0) {
      onLeave();
      return;
    }
    const r = target.getBoundingClientRect();
    const scale = r.width / target.offsetWidth;
    lastFrame = target.dataset.frameId ?? null;
    queue({ frameId: lastFrame, x: Math.max(0, (clientX - r.left) / scale), y: Math.max(0, (clientY - r.top) / scale) });
  };
  const onMove = (event: PointerEvent) => at(event.target instanceof Element ? event.target : null, event.clientX, event.clientY);
  const onFrame = (frame: BridgeFrame, message: { x: number; y: number; inside: boolean }) => {
    const iframe = frame.element;
    if (!message.inside || !iframe || iframe.offsetWidth === 0) return;
    const r = iframe.getBoundingClientRect();
    const scale = r.width / iframe.offsetWidth;
    at(iframe, r.left + message.x * scale, r.top + message.y * scale);
  };
  function onLeave() {
    if (lastFrame !== null) queue(null);
    lastFrame = null;
  }
  let offFrame: (() => void) | null = null;
  return {
    set(next: boolean) {
      if (next === on) return;
      on = next;
      setSharePointer(on);
      if (on) {
        document.addEventListener('pointermove', onMove, true);
        document.documentElement.addEventListener('pointerleave', onLeave);
        offFrame = onSharePointer(onFrame);
        return;
      }
      document.removeEventListener('pointermove', onMove, true);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      offFrame?.();
      offFrame = null;
      onLeave();
    },
  };
}

export function startShareLive(projectId: string, stage: () => HTMLElement | null): () => void {
  const layer = new CursorLayer(stage);
  const pointer = studioPointer(projectId, stage);
  let stopped = false;
  let control: AbortController | null = null;
  let retry = 0;

  const handle = (event: SharePresenceEvent) => {
    if (event.type === 'state') {
      layer.set(event.cursors);
      pointer.set(event.wantCursor);
    } else if (event.type === 'cursor') layer.put(event.cursor);
    else if (event.type === 'leave') layer.drop(event.linkId, event.viewer);
  };

  const connect = () => {
    window.clearTimeout(retry);
    control?.abort();
    if (stopped) return;
    const own = new AbortController();
    control = own;
    void fetch(`/api/projects/${encodeURIComponent(projectId)}/share-presence`, { headers: authHeaders(), signal: own.signal })
      .then((res) => (res.ok ? readEvents(res, handle) : undefined))
      .catch(() => undefined)
      .finally(() => {
        if (control !== own || stopped) return;
        layer.set([]);
        pointer.set(false);
        retry = window.setTimeout(connect, RETRY_MS);
      });
  };

  const onChanged = (event: Event) => {
    if ((event as CustomEvent<{ projectId?: string }>).detail?.projectId === projectId) connect();
  };
  window.addEventListener(SHARES_CHANGED, onChanged);
  connect();

  return () => {
    stopped = true;
    window.removeEventListener(SHARES_CHANGED, onChanged);
    window.clearTimeout(retry);
    control?.abort();
    pointer.set(false);
    layer.destroy();
  };
}
