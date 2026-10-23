import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { BrowserWindow, session, type Session, type WebContents } from 'electron';
import { PNG } from 'pngjs';
import type { RenderClip, RenderErrors } from '../src/shared/render-rpc.js';

const POOL_SIZE = 3;
const IDLE_CLOSE_MS = 30_000;
const NETWORK_QUIET_MS = 500;
const MAX_SEGMENT_PX = 8000;
const renderSessions = new WeakSet<Session>();

interface Slot {
  index: number;
  window: BrowserWindow;
  busy: boolean;
  idleTimer: NodeJS.Timeout | null;
}

interface CdpEvent {
  method: string;
  params: Record<string, unknown>;
}

export interface PageState {
  slot: Slot;
  errors: RenderErrors;
  inflight: Set<string>;
  lastNetworkAt: number;
}

export function isRenderContents(contents: WebContents): boolean {
  return renderSessions.has(contents.session);
}

function renderSession(index: number): Session {
  const partition = `studio-render-${index}`;
  const created = session.fromPartition(partition, { cache: false });
  if (!renderSessions.has(created)) {
    renderSessions.add(created);
    created.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    created.setPermissionCheckHandler(() => false);
  }
  return created;
}

function isFaviconMiss(url: string | undefined): boolean {
  try {
    return !!url && new URL(url).pathname === '/favicon.ico';
  } catch {
    return false;
  }
}

function remoteText(arg: Record<string, unknown>): string {
  if (arg.value !== undefined) return typeof arg.value === 'string' ? arg.value : JSON.stringify(arg.value);
  return String(arg.description ?? arg.unserializableValue ?? '');
}

function consoleError(params: Record<string, unknown>): string | null {
  if (params.type !== 'error') return null;
  const frames = (params.stackTrace as { callFrames?: { url?: string }[] } | undefined)?.callFrames ?? [];
  if (isFaviconMiss(frames[0]?.url)) return null;
  return ((params.args as Record<string, unknown>[] | undefined) ?? []).map(remoteText).join(' ');
}

function logError(params: Record<string, unknown>): string | null {
  const entry = params.entry as { level?: string; text?: string; url?: string } | undefined;
  if (entry?.level !== 'error' || isFaviconMiss(entry.url)) return null;
  return entry.text ?? '';
}

function exceptionText(params: Record<string, unknown>): string {
  const details = params.exceptionDetails as { text?: string; exception?: { description?: string } } | undefined;
  return details?.exception?.description ?? details?.text ?? 'Uncaught exception';
}

function trackNetwork(state: PageState, event: CdpEvent): void {
  const requestId = String(event.params.requestId ?? '');
  if (event.method === 'Network.requestWillBeSent') state.inflight.add(requestId);
  else if (event.method === 'Network.loadingFinished' || event.method === 'Network.loadingFailed') state.inflight.delete(requestId);
  else return;
  state.lastNetworkAt = Date.now();
}

function onCdpEvent(state: PageState, event: CdpEvent): void {
  trackNetwork(state, event);
  if (event.method === 'Runtime.consoleAPICalled') {
    const text = consoleError(event.params);
    if (text !== null) state.errors.consoleErrors.push(text);
  } else if (event.method === 'Log.entryAdded') {
    const text = logError(event.params);
    if (text !== null) state.errors.consoleErrors.push(text);
  } else if (event.method === 'Runtime.exceptionThrown') {
    state.errors.pageErrors.push(exceptionText(event.params));
  }
}

export class RenderPool {
  constructor(private readonly blockedOrigins: () => string[] = () => []) {}

  private readonly slots: Slot[] = [];
  private readonly waiters: ((slot: Slot) => void)[] = [];
  private closed = false;

  private createSlot(index: number): Slot {
    const window = new BrowserWindow({
      show: false,
      width: 1440,
      height: 900,
      useContentSize: true,
      paintWhenInitiallyHidden: true,
      webPreferences: { session: renderSession(index), sandbox: true, contextIsolation: true, nodeIntegration: false, backgroundThrottling: false, spellcheck: false },
    });
    const slot: Slot = { index, window, busy: false, idleTimer: null };
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', (event, url) => {
      if (!this.allowed(url)) event.preventDefault();
    });
    window.webContents.on('render-process-gone', () => this.dropSlot(slot));
    window.on('closed', () => this.dropSlot(slot));
    return slot;
  }

  private allowed(url: string): boolean {
    if (url === 'about:blank') return true;
    if (!url.startsWith('http://')) return false;
    return !this.blockedOrigins().includes(new URL(url).origin);
  }

  private dropSlot(slot: Slot): void {
    const position = this.slots.indexOf(slot);
    if (position >= 0) this.slots.splice(position, 1);
    if (slot.idleTimer) clearTimeout(slot.idleTimer);
    if (!slot.window.isDestroyed()) slot.window.destroy();
  }

  private freeIndex(): number {
    const used = new Set(this.slots.map((slot) => slot.index));
    let index = 0;
    while (used.has(index)) index += 1;
    return index;
  }

  private acquire(): Promise<Slot> {
    if (this.closed) return Promise.reject(new Error('render pool is closed'));
    const idle = this.slots.find((slot) => !slot.busy && !slot.window.isDestroyed());
    const slot = idle ?? (this.slots.length < POOL_SIZE ? this.addSlot() : null);
    if (slot) return Promise.resolve(this.claim(slot));
    return new Promise((resolve) => this.waiters.push(resolve));
  }

  private addSlot(): Slot {
    const slot = this.createSlot(this.freeIndex());
    this.slots.push(slot);
    return slot;
  }

  private claim(slot: Slot): Slot {
    slot.busy = true;
    if (slot.idleTimer) clearTimeout(slot.idleTimer);
    slot.idleTimer = null;
    return slot;
  }

  private release(slot: Slot): void {
    slot.busy = false;
    const next = this.waiters.shift();
    if (next && !slot.window.isDestroyed()) {
      next(this.claim(slot));
      return;
    }
    if (next) {
      this.acquire().then(next, () => undefined);
      return;
    }
    slot.idleTimer = setTimeout(() => this.dropSlot(slot), IDLE_CLOSE_MS);
  }

  async open(width: number, height: number): Promise<PageState> {
    const slot = await this.acquire();
    const state: PageState = { slot, errors: { consoleErrors: [], pageErrors: [] }, inflight: new Set(), lastNetworkAt: Date.now() };
    try {
      await this.prepare(state, width, height);
      return state;
    } catch (error) {
      this.dropSlot(slot);
      this.release(slot);
      throw error;
    }
  }

  private async prepare(state: PageState, width: number, height: number): Promise<void> {
    const contents = state.slot.window.webContents;
    state.slot.window.setContentSize(width, height);
    if (contents.getURL() === '') await contents.loadURL('about:blank');
    const cdp = contents.debugger;
    if (!cdp.isAttached()) cdp.attach('1.3');
    cdp.removeAllListeners('message');
    cdp.on('message', (_event, method, params) => onCdpEvent(state, { method, params: (params ?? {}) as Record<string, unknown> }));
    await cdp.sendCommand('Network.enable');
    await cdp.sendCommand('Runtime.enable');
    await cdp.sendCommand('Log.enable');
    await cdp.sendCommand('Page.enable');
    await cdp.sendCommand('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    await cdp.sendCommand('Emulation.setScrollbarsHidden', { hidden: true });
  }

  async goto(state: PageState, url: string, timeoutMs: number, settleMs: number): Promise<void> {
    if (!this.allowed(url)) throw new Error(`render pool will not load ${url}`);
    const contents = state.slot.window.webContents;
    const loading = contents.loadURL(url);
    const timeout = new Promise<never>((_resolve, reject) => setTimeout(() => reject(new Error(`page.goto: Timeout ${timeoutMs}ms exceeded`)), timeoutMs).unref());
    await Promise.race([loading, timeout]);
    await this.networkIdle(state, settleMs);
  }

  private async networkIdle(state: PageState, settleMs: number): Promise<void> {
    const deadline = Date.now() + settleMs;
    while (Date.now() < deadline) {
      if (state.inflight.size === 0 && Date.now() - state.lastNetworkAt >= NETWORK_QUIET_MS) return;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  async evaluate(state: PageState, expression: string): Promise<unknown> {
    const reply = (await state.slot.window.webContents.debugger.sendCommand('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: false })) as {
      result?: { value?: unknown };
      exceptionDetails?: { text?: string; exception?: { description?: string } };
    };
    if (reply.exceptionDetails) throw new Error(reply.exceptionDetails.exception?.description ?? reply.exceptionDetails.text ?? 'evaluate failed');
    return reply.result?.value;
  }

  private async contentSize(state: PageState): Promise<{ width: number; height: number }> {
    const metrics = (await state.slot.window.webContents.debugger.sendCommand('Page.getLayoutMetrics')) as { cssContentSize: { width: number; height: number } };
    const scroll = (await this.evaluate(state, '[document.documentElement.scrollWidth, document.documentElement.scrollHeight]')) as [number, number];
    return { width: Math.max(Math.ceil(metrics.cssContentSize.width), scroll[0]), height: Math.max(Math.ceil(metrics.cssContentSize.height), scroll[1]) };
  }

  private async captureClip(state: PageState, clip: RenderClip): Promise<PNG> {
    const shot = (await state.slot.window.webContents.debugger.sendCommand('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
      fromSurface: true,
      clip: { ...clip, scale: 1 },
    })) as { data: string };
    return PNG.sync.read(Buffer.from(shot.data, 'base64'));
  }

  private async captureTall(state: PageState, clip: RenderClip): Promise<PNG> {
    const out = new PNG({ width: clip.width, height: clip.height });
    for (let offset = 0; offset < clip.height; offset += MAX_SEGMENT_PX) {
      const height = Math.min(MAX_SEGMENT_PX, clip.height - offset);
      const part = await this.captureClip(state, { x: clip.x, y: clip.y + offset, width: clip.width, height });
      PNG.bitblt(part, out, 0, 0, Math.min(part.width, clip.width), Math.min(part.height, height), 0, offset);
    }
    return out;
  }

  async screenshot(state: PageState, outPath: string, clip?: RenderClip): Promise<{ width: number; height: number }> {
    const size = await this.contentSize(state);
    const target = clip ?? { x: 0, y: 0, width: size.width, height: size.height };
    const rounded = { x: Math.round(target.x), y: Math.round(target.y), width: Math.max(1, Math.round(target.width)), height: Math.max(1, Math.round(target.height)) };
    const image = rounded.height > MAX_SEGMENT_PX ? await this.captureTall(state, rounded) : await this.captureClip(state, rounded);
    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, PNG.sync.write(image));
    return { width: image.width, height: image.height };
  }

  async close(state: PageState): Promise<void> {
    const { slot } = state;
    if (slot.window.isDestroyed()) return this.release(slot);
    const cdp = slot.window.webContents.debugger;
    cdp.removeAllListeners('message');
    await slot.window.webContents.loadURL('about:blank').catch(() => undefined);
    await slot.window.webContents.session.clearStorageData().catch(() => undefined);
    this.release(slot);
  }

  destroy(): void {
    this.closed = true;
    for (const slot of [...this.slots]) this.dropSlot(slot);
  }
}
