import type { RenderBackend, RenderPage } from './render-backend.js';

export interface PageSize {
  width: number;
  height: number;
  scale?: number;
}

interface IdlePage {
  page: RenderPage;
  timer: NodeJS.Timeout;
}

const MAX_IDLE = 12;
const MAX_ACTIVE = { playwright: 6, electron: 3 } as const;
const IDLE_CLOSE_MS = 10 * 60_000;

function sizeKey(size: PageSize): string {
  return `${size.width}x${size.height}@${size.scale ?? 1}`;
}

export class WarmPages {
  private readonly idle = new Map<string, IdlePage[]>();
  private count = 0;
  private closed = false;
  private active = 0;
  private readonly queue: (() => void)[] = [];

  constructor(private readonly backend: () => Promise<RenderBackend>) {}

  async lease<T>(size: PageSize, task: (page: RenderPage) => Promise<T>): Promise<T> {
    const backend = await this.backend();
    await this.slot(MAX_ACTIVE[backend.name]);
    try {
      return await this.run(backend, size, task);
    } finally {
      this.active -= 1;
      this.queue.shift()?.();
    }
  }

  private async slot(limit: number): Promise<void> {
    while (this.active >= limit) await new Promise<void>((resolve) => this.queue.push(resolve));
    this.active += 1;
  }

  private async run<T>(backend: RenderBackend, size: PageSize, task: (page: RenderPage) => Promise<T>): Promise<T> {
    const key = sizeKey(size);
    const page = this.take(key) ?? (await backend.open(size));
    let healthy = false;
    try {
      const value = await task(page);
      healthy = true;
      return value;
    } finally {
      if (healthy && backend.reusablePages && page.reset) void this.recycle(key, page, page.reset.bind(page));
      else await page.close();
    }
  }

  private take(key: string): RenderPage | null {
    const list = this.idle.get(key);
    const entry = list?.pop();
    if (!entry) return null;
    clearTimeout(entry.timer);
    this.count -= 1;
    return entry.page;
  }

  private async recycle(key: string, page: RenderPage, reset: () => Promise<void>): Promise<void> {
    try {
      await reset();
      this.keep(key, page);
    } catch {
      await page.close();
    }
  }

  private keep(key: string, page: RenderPage): void {
    if (this.closed || this.count >= MAX_IDLE) {
      void page.close();
      return;
    }
    const list = this.idle.get(key) ?? [];
    const timer = setTimeout(() => {
      const index = list.findIndex((entry) => entry.page === page);
      if (index === -1) return;
      list.splice(index, 1);
      this.count -= 1;
      void page.close();
    }, IDLE_CLOSE_MS);
    timer.unref();
    list.push({ page, timer });
    this.idle.set(key, list);
    this.count += 1;
  }

  async closeAll(): Promise<void> {
    this.closed = true;
    const pages = [...this.idle.values()].flat();
    this.idle.clear();
    this.count = 0;
    await Promise.all(
      pages.map(async (entry) => {
        clearTimeout(entry.timer);
        await entry.page.close();
      }),
    );
  }
}
