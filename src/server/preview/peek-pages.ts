import type { RenderPage } from './render-backend.js';

type Viewport = { width: number; height: number; scale?: number };
type Opener = (url: string, viewport: Viewport) => Promise<RenderPage>;
type Closer = (page: RenderPage) => Promise<void>;

interface WarmPage {
  page: RenderPage;
  freshAt: number;
  usedAt: number;
  ready: Promise<void>;
}

interface PageClock {
  hooked: boolean;
  rebuildAt: number;
  doneAt: number;
  mutationAt: number;
  now: number;
}

const MAX_PAGES = 4;
const IDLE_MS = 10 * 60_000;
const POLL_MS = 25;
const QUIET_MS = 120;
const REBUILD_WAIT_MS = 900;
const REFRESH_MAX_MS = 4000;
const GONE = /has been closed|Execution context was destroyed|Target closed|navigat/i;

const HOOK = `(() => {
  if (window.__studioWarm) return true;
  const clock = { rebuildAt: 0, doneAt: 0, mutationAt: 0 };
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
  new MutationObserver((records) => { if (records.some((record) => !devChrome(record.target))) clock.mutationAt = Date.now(); }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
  return true;
})()`;
const CLOCK = `(() => { const c = window.__studioWarm; return { hooked: Boolean(c), rebuildAt: c ? c.rebuildAt : 0, doneAt: c ? c.doneAt : 0, mutationAt: c ? c.mutationAt : 0, now: Date.now() }; })()`;

function keyOf(url: string, viewport: Viewport): string {
  return `${viewport.width}x${viewport.height}@${viewport.scale ?? 1} ${url}`;
}

const pause = (ms: number) => new Promise((done) => setTimeout(done, ms));

function refreshed(clock: PageClock, dirtyAt: number): boolean {
  const applied = clock.doneAt >= clock.rebuildAt || clock.mutationAt >= clock.rebuildAt;
  return clock.rebuildAt >= dirtyAt && applied && clock.now - Math.max(clock.mutationAt, clock.doneAt) >= QUIET_MS;
}

export class PeekPages {
  private readonly pages = new Map<string, WarmPage>();
  private dirtyAt = 0;

  constructor(
    private readonly open: Opener,
    private readonly closePage: Closer,
  ) {}

  markDirty(at = Date.now()): void {
    this.dirtyAt = Math.max(this.dirtyAt, at);
  }

  async run<T>(url: string, viewport: Viewport, task: (page: RenderPage) => Promise<T>): Promise<T> {
    const key = keyOf(url, viewport);
    for (let attempt = 0; ; attempt += 1) {
      const warm = await this.fresh(key, url, viewport);
      warm.usedAt = Date.now();
      try {
        return await task(warm.page);
      } catch (error) {
        if (this.pages.get(key) === warm) this.drop(key);
        if (attempt > 0 || !GONE.test(error instanceof Error ? error.message : String(error))) throw error;
      }
    }
  }

  async close(): Promise<void> {
    const all = [...this.pages.values()];
    this.pages.clear();
    await Promise.all(all.map(async (warm) => {
      const page = await warm.ready.then(() => warm.page).catch(() => null);
      if (page) await this.closePage(page);
    }));
  }

  private async fresh(key: string, url: string, viewport: Viewport): Promise<WarmPage> {
    this.sweep();
    const known = this.pages.get(key);
    if (known) {
      try {
        await known.ready;
        if (known.freshAt >= this.dirtyAt || (await this.caughtUp(known))) return known;
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
    const warm: WarmPage = { page: null as unknown as RenderPage, freshAt, usedAt: freshAt, ready: Promise.resolve() };
    warm.ready = (async () => {
      warm.page = await this.open(url, viewport);
      await warm.page.evaluate(HOOK);
    })();
    warm.ready.catch(() => this.pages.get(key) === warm && this.pages.delete(key));
    this.pages.set(key, warm);
    return warm;
  }

  private async caughtUp(warm: WarmPage): Promise<boolean> {
    const dirtyAt = this.dirtyAt;
    const started = Date.now();
    for (;;) {
      const clock = await warm.page.evaluate<PageClock>(CLOCK);
      if (!clock.hooked) return false;
      if (refreshed(clock, dirtyAt)) {
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
      if (index >= MAX_PAGES || now - warm.usedAt > IDLE_MS) this.drop(key);
    });
  }

  private drop(key: string): void {
    const warm = this.pages.get(key);
    if (!warm) return;
    this.pages.delete(key);
    void warm.ready.then(() => this.closePage(warm.page)).catch(() => undefined);
  }
}
