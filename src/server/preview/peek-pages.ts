import type { RenderPage } from './render-backend.js';

type Viewport = { width: number; height: number; scale?: number };
type Opener = (url: string, viewport: Viewport) => Promise<RenderPage>;
type Closer = (page: RenderPage) => Promise<void>;
type Lander = (page: RenderPage, url: string) => Promise<void>;
type Stamper = (url: string) => Promise<{ key: string; newest: number | null } | null>;

interface WarmPage {
  page: RenderPage;
  url: string;
  freshAt: number;
  loadedAt: number;
  usedAt: number;
  ready: Promise<void>;
  cold: boolean;
  live: boolean;
  busy: number;
  queued: boolean;
  lock: Promise<void> | null;
  drained: (() => void)[];
  stamp: string | null;
}

interface PageClock {
  hooked: boolean;
  rebuildAt: number;
  doneAt: number;
  mutationAt: number;
  bodyAt: number;
  taint: number;
  now: number;
}

const MAX_PAGES = 6;
const IDLE_MS = 3 * 60_000;
const SWEEP_MS = 30_000;
const POLL_MS = 25;
const QUIET_MS = 120;
const REBUILD_WAIT_MS = 900;
const STAMP_TRUST_MS = 1000;
const REFRESH_MAX_MS = 1500;
const GONE = /has been closed|Execution context was destroyed|Target closed|navigat/i;

const HOOK = `(() => {
  if (window.__studioWarm) return true;
  const clock = { rebuildAt: 0, doneAt: 0, mutationAt: 0, bodyAt: 0, taint: 0, paused: false, saving: false, saved: new Map() };
  window.__studioWarm = clock;
  for (const level of ['log', 'info', 'debug']) {
    const original = console[level].bind(console);
    console[level] = (...args) => {
      if (typeof args[0] === 'string' && args[0].includes('[Fast Refresh] rebuilding')) clock.rebuildAt = Date.now();
      if (typeof args[0] === 'string' && args[0].includes('[Fast Refresh] done')) clock.doneAt = Date.now();
      if (args[0] === '[vite]' && typeof args[1] === 'string' && args[1].startsWith('hot updated:')) clock.rebuildAt = clock.doneAt = Date.now();
      if (typeof args[0] === 'string' && args[0].startsWith('[vite] css hot updated:')) clock.rebuildAt = clock.doneAt = Date.now();
      original(...args);
    };
  }
  const devChrome = (node) => { const el = node && node.nodeType === 1 ? node : node && node.parentElement; return Boolean(el && el.closest && el.closest('nextjs-portal')); };
  const sheetOnly = (record) => record.type === 'childList' && record.target === document.head && record.removedNodes.length === 0 && [...record.addedNodes].every((node) => node.nodeName === 'STYLE');
  const keep = (record) => {
    if (clock.paused || sheetOnly(record)) return;
    if (clock.saving && record.type === 'attributes' && record.attributeName === 'style') {
      if (!clock.saved.has(record.target)) clock.saved.set(record.target, record.oldValue);
      return;
    }
    clock.taint += 1;
  };
  new MutationObserver((records) => {
    const real = records.filter((record) => !devChrome(record.target));
    if (real.length) clock.mutationAt = Date.now();
    if (real.some((record) => !document.head.contains(record.target))) clock.bodyAt = Date.now();
    real.forEach(keep);
  }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeOldValue: true, characterData: true });
  return true;
})()`;
const CLOCK = `(() => { const c = window.__studioWarm; return { hooked: Boolean(c), rebuildAt: c ? c.rebuildAt : 0, doneAt: c ? c.doneAt : 0, mutationAt: c ? c.mutationAt : 0, bodyAt: c ? c.bodyAt : 0, taint: c ? c.taint : 0, now: Date.now() }; })()`;
const SAVE = `(() => { const c = window.__studioWarm; if (!c) return -1; window.scrollTo(0, 0); c.saved = new Map(); c.saving = true; return c.taint; })()`;
const ROLLBACK = `new Promise((done) => {
  const c = window.__studioWarm;
  if (!c) return done(-1);
  c.saving = false;
  c.paused = true;
  for (const [el, old] of c.saved) { if (old === null) el.removeAttribute('style'); else el.setAttribute('style', old); }
  c.saved = new Map();
  window.scrollTo(0, 0);
  requestAnimationFrame(() => requestAnimationFrame(() => { c.paused = false; done(c.taint); }));
})`;
const PAUSE = `(() => { if (window.__studioWarm) window.__studioWarm.paused = true; return true; })()`;
const RESUME = `new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => { if (window.__studioWarm) window.__studioWarm.paused = false; done(true); })))`;
const HOT = `Boolean(window.next || window.__NEXT_DATA__ || self.__next_f || document.querySelector('script[src*="/@vite/client"]'))`;
const RELOAD_DEBOUNCE_MS = 40;

function shotsKeepTaint(page: RenderPage): RenderPage {
  return Object.assign(Object.create(page) as RenderPage, {
    async screenshot(outPath: string, clip?: Parameters<RenderPage['screenshot']>[1]) {
      await page.evaluate(PAUSE);
      try {
        await page.screenshot(outPath, clip);
      } finally {
        await page.evaluate(RESUME).catch(() => undefined);
      }
    },
  });
}

function keyOf(url: string, viewport: Viewport): string {
  return `${viewport.width}x${viewport.height}@${viewport.scale ?? 1} ${url}`;
}

const pause = (ms: number) => new Promise((done) => setTimeout(done, ms));

function refreshed(clock: PageClock, dirtyAt: number, styleOnly: boolean): boolean {
  const applied = clock.doneAt >= clock.rebuildAt || (styleOnly ? clock.mutationAt : clock.bodyAt) >= clock.rebuildAt;
  return clock.rebuildAt >= dirtyAt && applied && clock.now - Math.max(clock.mutationAt, clock.doneAt) >= QUIET_MS;
}

export class PeekPages {
  private readonly pages = new Map<string, WarmPage>();
  private dirtyAt = 0;
  private codeAt = 0;
  private coldDirtyAt = 0;
  private movedAt = 0;
  private reloadTimer: NodeJS.Timeout | null = null;
  private sweepTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly open: Opener,
    private readonly closePage: Closer,
    private readonly land?: Lander,
    private readonly stampOf: Stamper = async () => null,
  ) {}

  markDirty(at = Date.now(), coldAt = at, code = true, moved = true): void {
    this.dirtyAt = Math.max(this.dirtyAt, at);
    if (moved) this.movedAt = Math.max(this.movedAt, at);
    if (code) this.codeAt = Math.max(this.codeAt, at);
    this.coldDirtyAt = Math.max(this.coldDirtyAt, coldAt);
    if (!this.land || this.reloadTimer) return;
    this.reloadTimer = setTimeout(() => {
      this.reloadTimer = null;
      for (const warm of this.pages.values()) if (warm.cold && warm.busy === 0 && warm.freshAt < this.coldDirtyAt) void this.reload(warm).catch(() => undefined);
    }, RELOAD_DEBOUNCE_MS);
    this.reloadTimer.unref();
  }

  liveUrls(): string[] {
    return [...this.pages.values()].filter((warm) => warm.live).map((warm) => warm.url);
  }

  run<T>(url: string, viewport: Viewport, task: (page: RenderPage) => Promise<T>, layoutOnly = false): Promise<T> {
    return this.attempt(url, viewport, false, task, layoutOnly);
  }

  capture<T>(url: string, viewport: Viewport, task: (page: RenderPage) => Promise<T>): Promise<T> {
    return this.attempt(url, viewport, true, task);
  }

  private async attempt<T>(url: string, viewport: Viewport, exclusive: boolean, task: (page: RenderPage) => Promise<T>, layoutOnly = false): Promise<T> {
    const key = keyOf(url, viewport);
    for (let attempt = 0; ; attempt += 1) {
      const warm = await this.enter(key, url, viewport, exclusive, layoutOnly && attempt === 0);
      const leave = this.occupy(warm, exclusive);
      try {
        return exclusive ? await this.alone(warm, task) : await task(warm.page);
      } catch (error) {
        if (this.pages.get(key) === warm) this.drop(key);
        if (attempt > 0 || !GONE.test(error instanceof Error ? error.message : String(error))) throw error;
      } finally {
        leave();
      }
    }
  }

  private occupy(warm: WarmPage, exclusive: boolean): () => void {
    warm.usedAt = Date.now();
    warm.busy += 1;
    let release = (): void => undefined;
    if (exclusive) warm.lock = new Promise<void>((done) => (release = done));
    return () => {
      warm.busy -= 1;
      if (exclusive) {
        warm.lock = null;
        release();
      }
      if (warm.busy === 0) for (const waiter of warm.drained.splice(0)) waiter();
    };
  }

  private async enter(key: string, url: string, viewport: Viewport, exclusive: boolean, layoutOnly: boolean): Promise<WarmPage> {
    for (;;) {
      const warm = (layoutOnly ? await this.layoutCurrent(key) : null) ?? (await this.fresh(key, url, viewport));
      if (warm.lock) {
        await warm.lock;
        continue;
      }
      if (exclusive && warm.busy > 0) {
        await new Promise<void>((done) => warm.drained.push(done));
        continue;
      }
      return warm;
    }
  }

  private async alone<T>(warm: WarmPage, task: (page: RenderPage) => Promise<T>): Promise<T> {
    const before = await warm.page.evaluate<number>(SAVE);
    try {
      return await task(shotsKeepTaint(warm.page));
    } finally {
      const after = await warm.page.evaluate<number>(ROLLBACK).catch(() => -1);
      if (before < 0 || after !== before) void this.reload(warm, true).catch(() => undefined);
    }
  }

  private reload(warm: WarmPage, clean = false): Promise<void> {
    if (warm.queued) return warm.ready;
    const land = this.land;
    if (!land) return Promise.reject(new Error('no reload'));
    warm.queued = true;
    warm.ready = warm.ready.then(async () => {
      warm.queued = false;
      const at = Date.now();
      warm.stamp = (await this.stampOf(warm.url).catch(() => null))?.key ?? null;
      if (clean) await warm.page.reset?.();
      await land(warm.page, warm.url);
      await warm.page.evaluate(HOOK);
      warm.freshAt = Math.max(warm.freshAt, at);
      warm.loadedAt = Math.max(warm.loadedAt, at);
    });
    return warm.ready;
  }

  private async settled(warm: WarmPage): Promise<void> {
    for (let ready = warm.ready; ; ready = warm.ready) {
      await ready;
      if (ready === warm.ready) return;
    }
  }

  async close(): Promise<void> {
    if (this.sweepTimer) clearTimeout(this.sweepTimer);
    this.sweepTimer = null;
    const all = [...this.pages.values()];
    this.pages.clear();
    await Promise.all(all.map(async (warm) => {
      const page = await warm.ready.then(() => warm.page).catch(() => null);
      if (page) await this.closePage(page);
    }));
  }

  private async layoutCurrent(key: string): Promise<WarmPage | null> {
    const known = this.pages.get(key);
    if (!known?.live) return null;
    await this.settled(known).catch(() => undefined);
    return this.pages.get(key) === known && known.freshAt >= this.movedAt ? known : null;
  }

  private async fresh(key: string, url: string, viewport: Viewport): Promise<WarmPage> {
    this.sweep();
    const known = this.pages.get(key);
    if (known) {
      try {
        await this.settled(known);
        if (known.freshAt >= (known.cold ? this.coldDirtyAt : this.dirtyAt)) return known;
        if (await this.currentWithMappableCode(known)) return known;
        if (this.land) {
          await this.reload(known);
          await this.settled(known);
          return known;
        }
      } catch {
        this.drop(key);
      }
    }
    const warm = this.load(key, url, viewport);
    await warm.ready;
    return warm;
  }

  private load(key: string, url: string, viewport: Viewport): WarmPage {
    this.drop(key);
    const freshAt = Date.now();
    const warm: WarmPage = { page: null as unknown as RenderPage, url, freshAt, loadedAt: freshAt, usedAt: freshAt, ready: Promise.resolve(), cold: false, live: false, busy: 0, queued: false, lock: null, drained: [], stamp: null };
    warm.ready = (async () => {
      warm.stamp = (await this.stampOf(url).catch(() => null))?.key ?? null;
      warm.page = await this.open(url, viewport);
      await warm.page.evaluate(HOOK);
      warm.cold = !(await warm.page.evaluate<boolean>(HOT).catch(() => true));
      warm.live = !warm.cold;
    })();
    warm.ready.catch(() => this.pages.get(key) === warm && this.pages.delete(key));
    this.pages.set(key, warm);
    this.sweepLater();
    return warm;
  }

  private async currentWithMappableCode(warm: WarmPage): Promise<boolean> {
    if (warm.cold) return false;
    if (warm.loadedAt >= this.movedAt) return this.current(warm);
    await this.noticed(warm, this.dirtyAt);
    return false;
  }

  private async noticed(warm: WarmPage, dirtyAt: number): Promise<void> {
    for (;;) {
      const clock = await warm.page.evaluate<PageClock>(CLOCK);
      if (!clock.hooked || clock.rebuildAt >= dirtyAt || clock.now - dirtyAt > REBUILD_WAIT_MS) return;
      await pause(POLL_MS);
    }
  }

  private async current(warm: WarmPage): Promise<boolean> {
    const dirtyAt = this.dirtyAt;
    if (await this.untouched(warm, dirtyAt)) return true;
    if (await this.caughtUp(warm, dirtyAt)) {
      this.restampLater(warm, dirtyAt);
      return true;
    }
    await pause(dirtyAt + STAMP_TRUST_MS - Date.now());
    return this.untouched(warm, dirtyAt);
  }

  private async untouched(warm: WarmPage, dirtyAt: number): Promise<boolean> {
    if (warm.stamp === null || Date.now() - dirtyAt < STAMP_TRUST_MS) return false;
    const stamp = await this.stampOf(warm.url).catch(() => null);
    if (stamp?.key !== warm.stamp) return false;
    warm.freshAt = Math.max(warm.freshAt, dirtyAt);
    return true;
  }

  private restampLater(warm: WarmPage, dirtyAt: number): void {
    warm.stamp = null;
    const timer = setTimeout(() => {
      void this.stampOf(warm.url).then((stamp) => {
        if (this.dirtyAt === dirtyAt && warm.freshAt >= dirtyAt) warm.stamp = stamp?.key ?? null;
      }, () => undefined);
    }, Math.max(0, dirtyAt + STAMP_TRUST_MS - Date.now()));
    timer.unref();
  }

  private async caughtUp(warm: WarmPage, dirtyAt: number): Promise<boolean> {
    const started = Date.now();
    for (;;) {
      const clock = await warm.page.evaluate<PageClock>(CLOCK);
      if (!clock.hooked) return false;
      if (refreshed(clock, dirtyAt, this.codeAt <= warm.freshAt)) {
        warm.freshAt = Math.max(warm.freshAt, dirtyAt);
        return true;
      }
      const waited = Date.now() - started;
      if (waited > REFRESH_MAX_MS || (clock.rebuildAt < dirtyAt && clock.now - dirtyAt > REBUILD_WAIT_MS)) return false;
      await pause(POLL_MS);
    }
  }

  private sweep(): void {
    const now = Date.now();
    const byUse = [...this.pages.entries()].sort((a, b) => b[1].usedAt - a[1].usedAt);
    byUse.forEach(([key, warm], index) => {
      if (index >= MAX_PAGES || (warm.busy === 0 && now - warm.usedAt > IDLE_MS)) this.drop(key);
    });
    this.sweepLater();
  }

  private sweepLater(): void {
    if (this.sweepTimer || this.pages.size === 0) return;
    this.sweepTimer = setTimeout(() => {
      this.sweepTimer = null;
      this.sweep();
    }, SWEEP_MS);
    this.sweepTimer.unref();
  }

  private drop(key: string): void {
    const warm = this.pages.get(key);
    if (!warm) return;
    this.pages.delete(key);
    void warm.ready.then(() => this.closePage(warm.page)).catch(() => undefined);
  }
}
