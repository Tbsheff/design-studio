import { existsSync, readdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Browser, BrowserContext, LaunchOptions, Page, Route } from 'playwright-core';
import { COLLECT_SCRIPT } from './browser-collect.js';
import type { LivePage, LiveSheet } from './browser-collect.js';
import { FetchBlockedError, FetchFailedError, checkUrl, safeRequest } from './safe-fetch.js';
import type { PassThroughRequest, PassThroughResponse } from './safe-fetch.js';

export const NO_BROWSER_NOTE = 'Install Google Chrome to read sites that build their styles in JavaScript.';
export const BROWSER_TOTAL_MS = 20_000;
const IDLE_MS = 8_000;
const MAX_REQUESTS = 300;
const MAX_TOTAL_BYTES = 20 * 1024 * 1024;
const REQUEST_MS = 10_000;
const MAX_SHEETS = 40;
const MAX_HTML_CHARS = 2 * 1024 * 1024;
const MAX_SHOT_HEIGHT = 6000;
const MAX_SHOT_BYTES = 8 * 1024 * 1024;
const VIEWPORT = { width: 1440, height: 900 };
const TYPE_CAPS: Record<string, number> = {
  document: 5 * 1024 * 1024,
  script: 5 * 1024 * 1024,
  stylesheet: 2 * 1024 * 1024,
  font: 2 * 1024 * 1024,
  image: 3 * 1024 * 1024,
};
const DEFAULT_CAP = 2 * 1024 * 1024;
const SKIPPED_TYPES = new Set(['media', 'texttrack', 'eventsource', 'websocket', 'manifest']);
const METHODS = new Set(['GET', 'HEAD', 'POST']);
const REDIRECTS = new Set([301, 302, 303, 307, 308]);
const MAX_REDIRECTS = 5;
const DROP_REQUEST_HEADERS = new Set(['host', 'connection', 'content-length', 'accept-encoding', 'keep-alive', 'transfer-encoding', 'upgrade', 'proxy-connection']);
const DROP_RESPONSE_HEADERS = new Set(['content-encoding', 'content-length', 'transfer-encoding', 'connection', 'keep-alive']);
const CHROME_ARGS = [
  '--proxy-server=http://127.0.0.1:9',
  '--proxy-bypass-list=<-loopback>',
  '--host-resolver-rules=MAP * ~NOTFOUND',
  '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
  '--disable-background-networking',
  '--disable-component-update',
  '--disable-domain-reliability',
  '--disable-sync',
  '--disable-extensions',
  '--no-pings',
  '--mute-audio',
  '--no-first-run',
  '--no-default-browser-check',
];
const WALL_TEXT = /just a moment|attention required|checking (if the site connection is secure|your browser)|verify (that )?you are (a )?human|are you a robot|access denied|enable javascript and cookies to continue|ddos protection by|cf-browser-verification|captcha|pardon our interruption|press (&|and) hold|request unsuccessful/i;
const LOGIN_TEXT = /\b(sign in|log in|login|sign on)\b/i;

export interface BrowserRequests {
  count: number;
  bytes: number;
  refused: string[];
  skipped: number;
}

export interface BrowserRead {
  url: string;
  status: number;
  html: string;
  live: LivePage;
  sheets: LiveSheet[];
  screenshot?: Buffer;
  logo?: Buffer;
  blocked?: string;
  requests: BrowserRequests;
  browser: string;
  ms: number;
}

export type BrowserOutcome = { kind: 'read'; read: BrowserRead } | { kind: 'unavailable'; note: string } | { kind: 'failed'; error: string; requests?: BrowserRequests };

export interface BrowserReadOptions {
  allowLoopback: boolean;
  deadline: number;
}

type Chromium = typeof import('playwright-core').chromium;

interface LaunchChoice {
  label: string;
  options: LaunchOptions;
}

function chromiumPaths(): string[] {
  const home = os.homedir();
  if (process.platform === 'darwin') {
    const apps = ['Chromium.app/Contents/MacOS/Chromium', 'Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary', 'Brave Browser.app/Contents/MacOS/Brave Browser'];
    const found = apps.flatMap((app) => [path.join('/Applications', app), path.join(home, 'Applications', app)]);
    return [...found, ...playwrightCache(path.join(home, 'Library', 'Caches', 'ms-playwright'), ['chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium'])];
  }
  if (process.platform === 'win32') {
    const roots = [process.env.LOCALAPPDATA, process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)']].filter((root): root is string => Boolean(root));
    return roots.flatMap((root) => [path.join(root, 'Chromium', 'Application', 'chrome.exe'), path.join(root, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe')]);
  }
  return ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium', '/usr/bin/brave-browser', ...playwrightCache(path.join(home, '.cache', 'ms-playwright'), ['chrome-linux/chrome', 'chrome-linux64/chrome'])];
}

function playwrightCache(dir: string, inner: string[]): string[] {
  try {
    return readdirSync(dir)
      .filter((name) => name.startsWith('chromium-') && !name.includes('headless'))
      .sort()
      .reverse()
      .flatMap((name) => inner.map((tail) => path.join(dir, name, tail)));
  } catch {
    return [];
  }
}

function launchChoices(): LaunchChoice[] {
  const forced = process.env.STUDIO_BROWSER;
  if (forced === 'none' || forced === 'off') return [];
  const custom = process.env.STUDIO_BROWSER_PATH;
  if (custom) return existsSync(custom) ? [{ label: custom, options: { executablePath: custom } }] : [];
  return [
    { label: 'chrome', options: { channel: 'chrome' } },
    { label: 'msedge', options: { channel: 'msedge' } },
    ...chromiumPaths()
      .filter((file) => existsSync(file))
      .map((file) => ({ label: file, options: { executablePath: file } })),
  ];
}

let chosen: LaunchChoice | null = null;

async function loadChromium(): Promise<Chromium | null> {
  try {
    return (await import('playwright-core')).chromium;
  } catch {
    return null;
  }
}

async function launch(chromium: Chromium, timeout: number): Promise<{ browser: Browser; label: string } | null> {
  const choices = chosen ? [chosen, ...launchChoices().filter((choice) => choice.label !== chosen?.label)] : launchChoices();
  for (const choice of choices) {
    try {
      const browser = await chromium.launch({ ...choice.options, headless: true, timeout, args: CHROME_ARGS, chromiumSandbox: true, handleSIGINT: false, handleSIGTERM: false, handleSIGHUP: false });
      chosen = choice;
      return { browser, label: choice.label };
    } catch {
      if (chosen === choice) chosen = null;
    }
  }
  return null;
}

let tail: Promise<void> = Promise.resolve();

async function exclusive<T>(deadline: number, work: () => Promise<T>): Promise<T | null> {
  const previous = tail;
  let release: () => void = () => undefined;
  tail = new Promise<void>((resolve) => {
    release = resolve;
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<false>((resolve) => {
    timer = setTimeout(() => resolve(false), Math.max(0, deadline - Date.now()));
  });
  const turn = await Promise.race([previous.then(() => true as const), expired]);
  clearTimeout(timer);
  if (!turn) {
    void previous.then(release);
    return null;
  }
  try {
    return await work();
  } finally {
    release();
  }
}

function userAgent(version: string): string {
  const major = version.split('.')[0] || '130';
  const platform = process.platform === 'darwin' ? 'Macintosh; Intel Mac OS X 10_15_7' : process.platform === 'win32' ? 'Windows NT 10.0; Win64; x64' : 'X11; Linux x86_64';
  return `Mozilla/5.0 (${platform}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major}.0.0.0 Safari/537.36`;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message.split('\n')[0]!.slice(0, 300) : String(error).slice(0, 300);
}

class RequestGuard {
  readonly requests: BrowserRequests = { count: 0, bytes: 0, refused: [], skipped: 0 };
  readonly sheets: LiveSheet[] = [];
  mainStatus = 0;
  closed = false;
  page: Page | null = null;
  prefetched: PassThroughResponse | null = null;

  constructor(
    private readonly allowLoopback: boolean,
    private readonly deadline: number,
  ) {}

  refuse(url: string, why: string): void {
    if (this.requests.refused.length < 50) this.requests.refused.push(`${url.slice(0, 160)}: ${why}`);
  }

  private async abort(route: Route, code: 'blockedbyclient' | 'failed' = 'blockedbyclient'): Promise<void> {
    await route.abort(code).catch(() => undefined);
  }

  async handle(route: Route): Promise<void> {
    const request = route.request();
    const url = request.url();
    if (this.closed) return this.abort(route);
    if (!/^https?:/i.test(url)) {
      this.refuse(url, 'only http and https are allowed');
      return this.abort(route);
    }
    const type = request.resourceType();
    if (SKIPPED_TYPES.has(type)) {
      this.requests.skipped += 1;
      return this.abort(route);
    }
    if (!METHODS.has(request.method())) {
      this.refuse(url, `method ${request.method()} is not allowed`);
      return this.abort(route);
    }
    if (this.requests.count >= MAX_REQUESTS) {
      this.refuse(url, `more than ${MAX_REQUESTS} requests`);
      return this.abort(route);
    }
    try {
      checkUrl(url, this.allowLoopback);
    } catch (error) {
      this.refuse(url, errorText(error));
      return this.abort(route);
    }
    const cap = Math.min(TYPE_CAPS[type] ?? DEFAULT_CAP, MAX_TOTAL_BYTES - this.requests.bytes);
    if (cap <= 0) {
      this.refuse(url, `the ${MAX_TOTAL_BYTES / 1024 / 1024} MB limit for this site ran out`);
      return this.abort(route);
    }
    this.requests.count += 1;
    await this.forward(route, url, type, cap);
  }

  private policy(cap: number) {
    return { allowLoopback: this.allowLoopback, timeoutMs: REQUEST_MS, maxBytes: cap, maxRedirects: 0, deadline: this.deadline };
  }

  async follow(url: string, first: PassThroughRequest, cap: number): Promise<PassThroughResponse> {
    let current = url;
    let init = first;
    for (let hop = 0; ; hop += 1) {
      const response = await safeRequest(current, init, this.policy(cap));
      this.requests.bytes += response.body.length;
      const location = response.headers.location;
      if (!REDIRECTS.has(response.status) || !location) return response;
      if (hop >= MAX_REDIRECTS) throw new FetchFailedError(`${url} redirected more than ${MAX_REDIRECTS} times`);
      if (this.requests.count >= MAX_REQUESTS) throw new FetchFailedError(`more than ${MAX_REQUESTS} requests`);
      this.requests.count += 1;
      current = checkUrl(new URL(location, current).href, this.allowLoopback).href;
      if (response.status === 303 || ((response.status === 301 || response.status === 302) && init.method === 'POST')) init = { method: 'GET', headers: init.headers };
    }
  }

  async start(url: string, agent: string): Promise<string> {
    this.requests.count += 1;
    const response = await this.follow(url, { method: 'GET', headers: { 'user-agent': agent, accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'accept-language': 'en-US,en;q=0.9' } }, TYPE_CAPS.document!);
    this.prefetched = response;
    this.mainStatus = response.status;
    return response.url;
  }

  private async fulfill(route: Route, response: PassThroughResponse): Promise<void> {
    const headers = Object.fromEntries(Object.entries(response.headers).filter(([name]) => !DROP_RESPONSE_HEADERS.has(name.toLowerCase())));
    await route.fulfill({ status: response.status, headers, body: response.body }).catch(() => undefined);
  }

  private async forward(route: Route, url: string, type: string, cap: number): Promise<void> {
    const request = route.request();
    try {
      const isMain = request.isNavigationRequest() && this.page !== null && request.frame() === this.page.mainFrame();
      const prefetched = this.prefetched;
      if (isMain && prefetched && prefetched.url === url) {
        this.prefetched = null;
        this.requests.count -= 1;
        return this.fulfill(route, prefetched);
      }
      const raw = await request.allHeaders();
      const headers = Object.fromEntries(Object.entries(raw).filter(([name]) => !name.startsWith(':') && !DROP_REQUEST_HEADERS.has(name.toLowerCase())));
      const body = request.method() === 'POST' ? (request.postDataBuffer() ?? undefined) : undefined;
      const response = await this.follow(url, { method: request.method(), headers, ...(body ? { body } : {}) }, cap);
      if (isMain) this.mainStatus = response.status;
      if (request.isNavigationRequest() && /attachment/i.test(response.headers['content-disposition'] ?? '')) {
        this.refuse(url, 'downloads are not allowed');
        return this.abort(route);
      }
      if (type === 'stylesheet' && response.status >= 200 && response.status < 300 && this.sheets.length < MAX_SHEETS) this.sheets.push({ url, css: response.body.toString('utf8') });
      await this.fulfill(route, response);
    } catch (error) {
      if (error instanceof FetchBlockedError) this.refuse(url, error.message);
      await this.abort(route, error instanceof FetchBlockedError ? 'blockedbyclient' : 'failed');
    }
  }
}

function wallOf(status: number, live: LivePage, host: string): string | undefined {
  const short = live.textLength < 2500;
  if (WALL_TEXT.test(live.title) || (short && WALL_TEXT.test(live.text))) return `${host} showed a bot check to the browser`;
  if (status === 403 || status === 429 || status === 503) return `${host} answered ${status} to the browser`;
  if (live.hasPassword && live.textLength < 1500 && LOGIN_TEXT.test(`${live.title} ${live.text.slice(0, 600)}`)) return `${host} asks you to sign in`;
  return undefined;
}

function left(deadline: number, floor = 1): number {
  return Math.max(floor, deadline - Date.now());
}

async function screenshotOf(page: Page, docHeight: number, deadline: number): Promise<Buffer | undefined> {
  const height = Math.max(VIEWPORT.height, Math.min(MAX_SHOT_HEIGHT, Math.round(docHeight)));
  try {
    const full = await page.screenshot({ type: 'png', fullPage: true, clip: { x: 0, y: 0, width: VIEWPORT.width, height }, timeout: left(deadline, 500), animations: 'disabled' });
    if (full.length <= MAX_SHOT_BYTES) return full;
    return await page.screenshot({ type: 'png', timeout: left(deadline, 500), animations: 'disabled' });
  } catch {
    return undefined;
  }
}

async function logoOf(page: Page, deadline: number): Promise<Buffer | undefined> {
  try {
    const shot = await page.locator('[data-studio-logo]').first().screenshot({ type: 'png', timeout: Math.min(2000, left(deadline, 200)), omitBackground: false });
    return shot.length <= 1024 * 1024 ? shot : undefined;
  } catch {
    return undefined;
  }
}

function withDeadline<T>(work: Promise<T>, deadline: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(label)), left(deadline));
  });
  return Promise.race([work, expired]).finally(() => clearTimeout(timer));
}

async function openContext(browser: Browser, guard: RequestGuard, agent: string): Promise<BrowserContext> {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    userAgent: agent,
    javaScriptEnabled: true,
    serviceWorkers: 'block',
    acceptDownloads: false,
    permissions: [],
    locale: 'en-US',
    colorScheme: 'light',
    reducedMotion: 'reduce',
  });
  await context.route('**/*', (route) => guard.handle(route));
  await context.routeWebSocket(/.*/, (socket) => {
    guard.refuse(socket.url(), 'WebSockets are not allowed');
    void socket.close().catch(() => undefined);
  });
  return context;
}

async function readPage(browser: Browser, label: string, url: string, options: BrowserReadOptions, started: number): Promise<BrowserOutcome> {
  const guard = new RequestGuard(options.allowLoopback, options.deadline);
  const agent = userAgent(browser.version());
  let start: string;
  try {
    start = await guard.start(url, agent);
  } catch (error) {
    return { kind: 'failed', error: errorText(error), requests: guard.requests };
  }
  const context = await openContext(browser, guard, agent);
  const page = await context.newPage();
  guard.page = page;
  context.on('page', (other) => {
    if (other !== page) void other.close().catch(() => undefined);
  });
  page.on('dialog', (dialog) => void dialog.dismiss().catch(() => undefined));
  page.on('download', (download) => void download.cancel().catch(() => undefined));
  try {
    const response = await page.goto(start, { waitUntil: 'domcontentloaded', timeout: left(options.deadline) });
    await page.waitForLoadState('networkidle', { timeout: Math.max(1, Math.min(IDLE_MS, left(options.deadline) - 6000)) }).catch(() => undefined);
    const live = await withDeadline(page.evaluate<LivePage>(COLLECT_SCRIPT), options.deadline, 'the page did not finish within the time limit');
    const status = guard.mainStatus || response?.status() || 0;
    const finalUrl = page.url();
    const host = new URL(finalUrl).host;
    const blocked = wallOf(status, live, host);
    const html = (await page.content().catch(() => '')).slice(0, MAX_HTML_CHARS);
    const screenshot = blocked ? undefined : await screenshotOf(page, live.docHeight, options.deadline);
    const logo = blocked || !live.logo ? undefined : await logoOf(page, options.deadline);
    const crossSheets = guard.sheets.filter((sheet) => live.crossOrigin.includes(sheet.url) || !live.sheets.some((own) => own.url === sheet.url));
    const sheets = [...live.sheets.filter((sheet) => sheet.css.trim() !== ''), ...crossSheets].slice(0, MAX_SHEETS);
    guard.closed = true;
    return {
      kind: 'read',
      read: { url: finalUrl, status, html, live, sheets, ...(screenshot ? { screenshot } : {}), ...(logo ? { logo } : {}), ...(blocked ? { blocked } : {}), requests: guard.requests, browser: label, ms: Date.now() - started },
    };
  } catch (error) {
    guard.closed = true;
    const refused = guard.requests.refused.find((line) => line.startsWith(url.slice(0, 160)));
    return { kind: 'failed', error: refused ? `blocked (${refused.slice(refused.indexOf(': ') + 2)})` : errorText(error), requests: guard.requests };
  } finally {
    await context.close().catch(() => undefined);
  }
}

export function browserReadsEnabled(): boolean {
  return process.env.STUDIO_BROWSER !== 'off' && !process.env.VITEST;
}

export async function readWithBrowser(url: string, options: BrowserReadOptions): Promise<BrowserOutcome> {
  try {
    checkUrl(url, options.allowLoopback);
  } catch (error) {
    return { kind: 'failed', error: errorText(error) };
  }
  const chromium = await loadChromium();
  if (!chromium) return { kind: 'unavailable', note: NO_BROWSER_NOTE };
  const outcome = await exclusive(options.deadline, async (): Promise<BrowserOutcome> => {
    const started = Date.now();
    const launched = await launch(chromium, Math.min(10_000, left(options.deadline)));
    if (!launched) return { kind: 'unavailable', note: NO_BROWSER_NOTE };
    const { browser, label } = launched;
    const killer = setTimeout(() => void browser.close().catch(() => undefined), left(options.deadline) + 1000);
    try {
      return await readPage(browser, label, url, options, started);
    } catch (error) {
      return { kind: 'failed', error: errorText(error) };
    } finally {
      clearTimeout(killer);
      await browser.close().catch(() => undefined);
    }
  });
  return outcome ?? { kind: 'failed', error: 'another website read was still running when the time limit ran out' };
}
