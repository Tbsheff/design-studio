import { chromium } from 'playwright-core';
import type { Frame, Page } from 'playwright-core';
import { cp, lstat, mkdir, mkdtemp, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Direction, Project, StudioEvent, StudioEventInput } from '../src/shared/contracts.js';
import { BRIDGE_PARENT_ORIGIN_PARAM, BRIDGE_TOKEN_PARAM, DEFAULT_SETTINGS } from '../src/shared/contracts.js';
import type { EventBus, ProjectStore, ServerConfig, VersionStore } from '../src/server/types.js';
import { createPreviewService } from '../src/server/preview/index.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EDIT_COUNT = 5;
const BRIDGE_TOKEN = 'devcheck-token';
const HOST = process.env.DEV_CHECK_HOST === 'localhost' ? 'localhost' : '127.0.0.1';

interface BridgeMessage {
  origin: string;
  at: number;
  data: { type?: string; token?: string; [key: string]: unknown };
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      probe.close(() => resolve(port));
    });
  });
}

function createBus(): EventBus & { events: StudioEvent[] } {
  const events: StudioEvent[] = [];
  const listeners = new Map<string, Set<(event: StudioEvent) => void>>();
  return {
    events,
    emit(input: StudioEventInput): StudioEvent {
      const event = { ...input, seq: events.length + 1, ts: Date.now() } as StudioEvent;
      events.push(event);
      for (const listener of listeners.get(input.projectId) ?? []) listener(event);
      return event;
    },
    since(projectId: string, afterSeq: number): StudioEvent[] {
      return events.filter((event) => event.projectId === projectId && event.seq > afterSeq);
    },
    subscribe(projectId: string, listener: (event: StudioEvent) => void): () => void {
      const set = listeners.get(projectId) ?? new Set();
      set.add(listener);
      listeners.set(projectId, set);
      return () => set.delete(listener);
    },
  };
}

function makeProject(id: string, kind: Project['kind'], workTree: string): Project {
  const direction: Direction = {
    id: 'main',
    name: 'Main',
    workTree,
    branch: 'd/main',
    headVersionId: null,
    parentVersionId: null,
    sessionId: null,
    createdAt: Date.now(),
  };
  return {
    id,
    name: id,
    kind,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    imported: null,
    entry: 'index.html',
    settings: DEFAULT_SETTINGS,
    directions: [direction],
  };
}

function createProjectStore(dataDir: string, all: Project[]): ProjectStore {
  const unsupported = (): never => {
    throw new Error('not supported in dev-check');
  };
  return {
    list: async () => all,
    get: async (projectId) => {
      const found = all.find((project) => project.id === projectId);
      if (!found) throw new Error(`no project ${projectId}`);
      return found;
    },
    create: unsupported,
    importFolder: unsupported,
    save: async () => undefined,
    addDirection: unsupported,
    updateDirection: unsupported,
    projectDir: (projectId) => path.join(dataDir, 'projects', projectId),
    saveAttachment: unsupported,
    readDesignMd: async () => null,
    writeDesignMd: unsupported,
    getAttachment: unsupported,
  };
}

function createVersionStore(): VersionStore {
  const unsupported = (): never => {
    throw new Error('not supported in dev-check');
  };
  return {
    ensureRepo: async () => undefined,
    commit: async () => null,
    list: async () => [],
    get: unsupported,
    status: async () => ({ dirty: true, changed: [] }),
    commitFile: async () => null,
    discard: unsupported,
    restore: unsupported,
    checkoutInto: unsupported,
    snapshot: unsupported,
    exportZip: unsupported,
  };
}

function waitForEvent(bus: EventBus, projectId: string, match: (event: StudioEvent) => boolean, timeoutMs: number): Promise<StudioEvent> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      unsubscribe();
      reject(new Error(`timed out waiting for event on ${projectId}`));
    }, timeoutMs);
    const unsubscribe = bus.subscribe(projectId, (event) => {
      if (!match(event)) return;
      clearTimeout(timer);
      unsubscribe();
      resolve(event);
    });
  });
}

function htmlSource(label: string): string {
  return [
    '<!doctype html>',
    '<html lang="en">',
    '  <head>',
    '    <meta charset="utf-8" />',
    '    <title>HTML check</title>',
    '    <link rel="stylesheet" href="style.css" />',
    '  </head>',
    '  <body>',
    '    <main class="hero">',
    `      <h1 id="title">${label}</h1>`,
    '      <p class="lede">A paragraph with <a href="#x" title="a > b">a link</a>.</p>',
    '    </main>',
    '  </body>',
    '</html>',
    '',
  ].join('\n');
}

function appSource(label: string): string {
  return [
    'export function App() {',
    '  return (',
    '    <main className="app">',
    `      <h1 id="title">${label}</h1>`,
    '      <p className="lede">React check</p>',
    '    </main>',
    '  );',
    '}',
    '',
  ].join('\n');
}

async function writeHtmlTree(root: string): Promise<void> {
  await mkdir(root, { recursive: true });
  await writeFile(path.join(root, 'index.html'), htmlSource('Edit 0'));
  await writeFile(path.join(root, 'style.css'), 'body { font-family: system-ui; margin: 0; } .hero { padding: 24px; }\n');
}

async function writeReactTree(root: string): Promise<void> {
  await mkdir(path.join(root, 'src'), { recursive: true });
  await writeFile(path.join(root, 'package.json'), JSON.stringify({ name: 'react-check', private: true, type: 'module' }, null, 2));
  await writeFile(
    path.join(root, 'vite.config.ts'),
    "import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\n\nexport default defineConfig({ plugins: [react()] });\n",
  );
  await writeFile(
    path.join(root, 'index.html'),
    '<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <title>React check</title>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.tsx"></script>\n  </body>\n</html>\n',
  );
  await writeFile(
    path.join(root, 'src', 'main.tsx'),
    "import { createRoot } from 'react-dom/client';\nimport { App } from './App';\n\ncreateRoot(document.getElementById('root')!).render(<App />);\n",
  );
  await writeFile(path.join(root, 'src', 'App.tsx'), appSource('Edit 0'));
  await writeFile(
    path.join(root, 'tsconfig.json'),
    JSON.stringify({ compilerOptions: { jsx: 'react-jsx', module: 'ESNext', moduleResolution: 'Bundler', strict: true } }, null, 2),
  );
  await symlink(path.join(REPO_ROOT, 'node_modules'), path.join(root, 'node_modules'), 'dir');
}

function wrapperHtml(src: string): string {
  return `<!doctype html><html><body style="margin:0">
<script>
window.__msgs = [];
window.addEventListener('message', (event) => {
  window.__msgs.push({ origin: event.origin, at: performance.timeOrigin + performance.now(), data: event.data });
});
</script>
<iframe id="preview" src="${src}" style="width:1200px;height:800px;border:0"></iframe>
</body></html>`;
}

function startWrapperServer(port: number): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const src = new URL(req.url ?? '/', 'http://wrapper.local').searchParams.get('src') ?? 'about:blank';
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      res.end(wrapperHtml(src.replace(/"/g, '&quot;')));
    });
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

async function messages(page: Page): Promise<BridgeMessage[]> {
  return page.evaluate(() => (window as unknown as { __msgs: BridgeMessage[] }).__msgs);
}

async function waitForMessage(page: Page, type: string, after = 0, timeoutMs = 15_000): Promise<BridgeMessage> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const found = (await messages(page)).slice(after).find((message) => message.data.type === type && message.data.token === BRIDGE_TOKEN);
    if (found) return found;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`no bridge message ${type}`);
}

async function previewFrame(page: Page, origin: string): Promise<Frame> {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const frame = page.frames().find((item) => item.url().startsWith(origin));
    if (frame) return frame;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`no frame for ${origin}`);
}

async function openInWrapper(page: Page, studioOrigin: string, url: string): Promise<{ frame: Frame; readyMs: number }> {
  const target = new URL(url);
  target.searchParams.set(BRIDGE_TOKEN_PARAM, BRIDGE_TOKEN);
  target.searchParams.set(BRIDGE_PARENT_ORIGIN_PARAM, studioOrigin);
  const started = Date.now();
  await page.goto(`${studioOrigin}/wrapper?src=${encodeURIComponent(target.toString())}`);
  await waitForMessage(page, 'ready');
  await waitForMessage(page, 'painted');
  const readyMs = Date.now() - started;
  return { frame: await previewFrame(page, target.origin), readyMs };
}

async function checkSelect(page: Page, frame: Frame): Promise<{ selector: string; source: unknown }> {
  const before = (await messages(page)).length;
  await page.evaluate((token) => {
    const iframe = document.getElementById('preview') as HTMLIFrameElement;
    iframe.contentWindow?.postMessage({ ns: 'studio', token, type: 'set-mode', mode: 'select' }, '*');
  }, BRIDGE_TOKEN);
  await new Promise((resolve) => setTimeout(resolve, 50));
  await frame.locator('#title').click();
  const message = await waitForMessage(page, 'select', before, 5_000);
  const selection = message.data.selection as { selector: string; source: unknown };
  await page.evaluate((token) => {
    const iframe = document.getElementById('preview') as HTMLIFrameElement;
    iframe.contentWindow?.postMessage({ ns: 'studio', token, type: 'set-mode', mode: 'none' }, '*');
  }, BRIDGE_TOKEN);
  return { selector: selection.selector, source: selection.source };
}

function stats(values: number[]): string {
  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  return `values=[${values.join(', ')}] median=${median} max=${sorted[sorted.length - 1] ?? 0}`;
}

async function main(): Promise<void> {
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'studio-preview-check-'));
  const dataDir = path.join(tmp, 'data');
  const htmlTree = path.join(tmp, 'html-tree');
  const reactTree = path.join(tmp, 'react-tree');
  await writeHtmlTree(htmlTree);
  await writeReactTree(reactTree);

  const previewPort = await freePort();
  const studioPort = await freePort();
  const config: ServerConfig = {
    dataDir,
    studioPort,
    previewPort,
    vitePortBase: 5300,
    studioToken: 'studio-secret-token',
    agentMode: 'mock',
    studioOrigin: `http://${HOST}:${studioPort}`,
    previewOrigin: `http://${HOST}:${previewPort}`,
  };
  const htmlProject = makeProject('phtml', 'html', htmlTree);
  const reactProject = makeProject('preact', 'react', reactTree);
  const bus = createBus();
  const projects = createProjectStore(dataDir, [htmlProject, reactProject]);
  const service = createPreviewService({ config, bus, projects, versions: createVersionStore() });
  const report: string[] = [];
  const failures: string[] = [];
  const check = (ok: boolean, label: string): void => {
    report.push(`${ok ? 'PASS' : 'FAIL'} ${label}`);
    if (!ok) failures.push(label);
  };

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const wrapperServer = await startWrapperServer(studioPort);
  try {
    await service.start();
    const htmlDirection = htmlProject.directions[0] as Direction;
    const reactDirection = reactProject.directions[0] as Direction;

    const htmlUrl = await service.directionUrl(htmlProject, htmlDirection);
    report.push(`html url ${htmlUrl}`);
    const htmlResponse = await fetch(htmlUrl);
    const htmlBody = await htmlResponse.text();
    check(htmlResponse.headers.get('content-security-policy')?.includes(config.studioOrigin) === true, 'html CSP frame-ancestors has studio origin');
    check(htmlResponse.headers.get('access-control-allow-origin') === null, 'html has no CORS header');
    check(htmlResponse.headers.get('cache-control') === 'no-store', 'html cache-control no-store');
    check(htmlBody.includes('data-studio-loc="index.html:10:7"'), 'html h1 annotated with index.html:10:7');
    check(!htmlBody.includes(config.studioToken), 'html never contains the studio token');
    const traversal = await fetch(`${new URL(htmlUrl).origin}/d/phtml/main/..%2f..%2f..%2fetc%2fpasswd`);
    check(traversal.status === 400 || traversal.status === 404, `path traversal blocked (status ${traversal.status})`);
    const traversal2 = await fetch(`${new URL(htmlUrl).origin}/d/phtml/main/%2e%2e/%2e%2e/etc/passwd`);
    check([400, 403, 404].includes(traversal2.status), `encoded dot traversal blocked (status ${traversal2.status})`);

    const page = await browser.newPage();
    const htmlOpen = await openInWrapper(page, config.studioOrigin, htmlUrl);
    report.push(`html iframe load to painted: ${htmlOpen.readyMs}ms`);
    const htmlLocCount = await htmlOpen.frame.locator('[data-studio-loc]').count();
    check(htmlLocCount >= 4, `html DOM has data-studio-loc (${htmlLocCount} elements)`);
    check(!htmlOpen.frame.url().includes(BRIDGE_TOKEN_PARAM), 'html bridge params stripped from URL');
    const htmlReady = await waitForMessage(page, 'ready');
    check(htmlReady.origin === new URL(htmlUrl).origin, 'html ready posted from the project preview origin');
    const wrongHost = await fetch(htmlUrl.replace(new URL(htmlUrl).host, `127.0.0.1:${config.previewPort}`));
    check(wrongHost.status === 403, `bare preview host refused for project paths (status ${wrongHost.status})`);
    const htmlSelect = await checkSelect(page, htmlOpen.frame);
    check(htmlSelect.selector === '#title', `html select selector ${htmlSelect.selector}`);
    check(JSON.stringify(htmlSelect.source) === JSON.stringify({ file: 'index.html', line: 10, col: 7 }), `html select source ${JSON.stringify(htmlSelect.source)}`);

    await service.directionUrl(htmlProject, htmlDirection);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const htmlLatencies: number[] = [];
    for (let edit = 1; edit <= EDIT_COUNT; edit += 1) {
      const waiting = waitForEvent(bus, htmlProject.id, (event) => event.type === 'files.changed', 3_000);
      const writtenAt = Date.now();
      await writeFile(path.join(htmlTree, 'index.html'), htmlSource(`Edit ${edit}`));
      const event = await waiting;
      if (event.type === 'files.changed') {
        htmlLatencies.push(event.changedAt - writtenAt);
        if (edit === 1) report.push(`html files.changed paths ${JSON.stringify(event.paths)}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    report.push(`html write -> files.changed ms: ${stats(htmlLatencies)}`);
    check(Math.max(...htmlLatencies) < 250, 'html files.changed under 250ms');
    const statusEvents = bus.events.filter((event) => event.type === 'status.changed' && event.projectId === htmlProject.id);
    check(statusEvents.length >= 1, `status.changed emitted (${statusEvents.length} for ${EDIT_COUNT} edits)`);

    const [reactUrl, reactUrlConcurrent] = await Promise.all([
      service.directionUrl(reactProject, reactDirection),
      service.directionUrl(reactProject, reactDirection),
    ]);
    report.push(`react url ${reactUrl}`);
    check(reactUrlConcurrent === reactUrl, 'react concurrent start deduped (same URL)');
    const reactOpen = await openInWrapper(page, config.studioOrigin, reactUrl);
    report.push(`react iframe load to painted: ${reactOpen.readyMs}ms`);
    await reactOpen.frame.waitForSelector('#title', { timeout: 15_000 });
    const reactLocCount = await reactOpen.frame.locator('[data-studio-loc]').count();
    check(reactLocCount >= 3, `react DOM has data-studio-loc (${reactLocCount} elements)`);
    const reactTitleLoc = await reactOpen.frame.locator('#title').getAttribute('data-studio-loc');
    check(reactTitleLoc === 'src/App.tsx:4:7', `react h1 loc ${reactTitleLoc}`);
    const reactSelect = await checkSelect(page, reactOpen.frame);
    check(JSON.stringify(reactSelect.source) === JSON.stringify({ file: 'src/App.tsx', line: 4, col: 7 }), `react select source ${JSON.stringify(reactSelect.source)}`);

    await reactOpen.frame.evaluate(() => {
      (window as unknown as { __hmrMarker: number }).__hmrMarker = 1;
    });
    const readyCountBefore = (await messages(page)).filter((message) => message.data.type === 'ready').length;
    await new Promise((resolve) => setTimeout(resolve, 300));
    const reactLatencies: number[] = [];
    for (let edit = 1; edit <= EDIT_COUNT; edit += 1) {
      const label = `Edit ${edit}`;
      await reactOpen.frame.evaluate((expected) => {
        const scope = window as unknown as { __seenAt?: number };
        scope.__seenAt = undefined;
        const observer = new MutationObserver(() => {
          if (document.getElementById('title')?.textContent === expected) {
            scope.__seenAt = performance.timeOrigin + performance.now();
            observer.disconnect();
          }
        });
        observer.observe(document.body, { subtree: true, childList: true, characterData: true });
      }, label);
      const writtenAt = Date.now();
      await writeFile(path.join(reactTree, 'src', 'App.tsx'), appSource(label));
      await reactOpen.frame.waitForFunction(
        () => (window as unknown as { __seenAt?: number }).__seenAt !== undefined,
        undefined,
        { timeout: 5_000, polling: 10 },
      );
      const seenAt = await reactOpen.frame.evaluate(() => (window as unknown as { __seenAt: number }).__seenAt);
      reactLatencies.push(Math.round(seenAt - writtenAt));
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    report.push(`react write -> HMR applied in DOM ms: ${stats(reactLatencies)}`);
    check(Math.max(...reactLatencies) < 750, 'react HMR under 750ms');
    const marker = await reactOpen.frame.evaluate(() => (window as unknown as { __hmrMarker?: number }).__hmrMarker);
    const readyCountAfter = (await messages(page)).filter((message) => message.data.type === 'ready').length;
    check(marker === 1 && readyCountAfter === readyCountBefore, 'react page kept state (HMR, no full reload) across 5 edits');
    const reactUrlAfter = await service.directionUrl(reactProject, reactDirection);
    const alive = await fetch(reactUrlAfter).then((response) => response.status, () => 0);
    check(reactUrlAfter === reactUrl && alive === 200, `vite server alive after ${EDIT_COUNT} edits (same URL, status ${alive})`);

    const buildError = waitForEvent(bus, reactProject.id, (event) => event.type === 'preview.build-error', 5_000).catch(() => null);
    await writeFile(path.join(reactTree, 'src', 'App.tsx'), 'export function App() {\n  return <main><h1>broken</main>;\n}\n');
    const errorEvent = await buildError;
    check(errorEvent !== null, 'preview.build-error emitted for a syntax error');
    if (errorEvent && errorEvent.type === 'preview.build-error') {
      report.push(`build-error file=${errorEvent.file} line=${errorEvent.line} message=${errorEvent.message.split('\n')[0]}`);
    }
    await writeFile(path.join(reactTree, 'src', 'App.tsx'), appSource('Recovered'));
    await reactOpen.frame.waitForFunction(() => document.getElementById('title')?.textContent === 'Recovered', undefined, { timeout: 10_000 }).then(
      () => check(true, 'react recovered after build error'),
      () => check(false, 'react recovered after build error'),
    );

    const checks = await service.renderCheck(reactProject, reactDirection);
    for (const result of checks) {
      report.push(`renderCheck react ${result.viewport} ok=${result.ok} overflow=${result.horizontalOverflow} console=${JSON.stringify(result.consoleErrors)} page=${result.pageErrors.length}`);
    }
    const htmlChecks = await service.renderCheck(htmlProject, htmlDirection);
    for (const result of htmlChecks) {
      report.push(`renderCheck html ${result.viewport} ok=${result.ok} overflow=${result.horizontalOverflow} console=${JSON.stringify(result.consoleErrors)} page=${result.pageErrors.length}`);
    }
    const reactFiles = (await readdir(reactTree, { recursive: true })).map(String).filter((file) => !file.startsWith('node_modules')).sort();
    check(JSON.stringify(reactFiles) === JSON.stringify(['index.html', 'package.json', 'src', 'src/App.tsx', 'src/main.tsx', 'tsconfig.json', 'vite.config.ts']), `react work tree unchanged by Vite ${JSON.stringify(reactFiles)}`);
    const htmlSnapshotDir = path.join(tmp, 'snapshots', 'html-abc123');
    await cp(htmlTree, htmlSnapshotDir, { recursive: true });
    const htmlSnapshotUrl = await service.snapshotUrl(htmlProject, 'abc123', htmlSnapshotDir);
    const snapshotResponse = await fetch(htmlSnapshotUrl);
    const snapshotBody = await snapshotResponse.text();
    check(
      htmlSnapshotUrl.includes('/s/phtml/abc123/') && snapshotResponse.status === 200 && snapshotBody.includes('data-studio-loc="index.html:10:7"') && snapshotBody.includes('/__studio/bridge.js'),
      `html snapshot served at ${htmlSnapshotUrl}`,
    );
    const reactSnapshotDir = path.join(tmp, 'snapshots', 'react-def456');
    await cp(reactTree, reactSnapshotDir, {
      recursive: true,
      filter: (source) => !source.includes(`${path.sep}node_modules`) && path.basename(source) !== 'vite.config.ts',
    });
    const reactSnapshotUrl = await service.snapshotUrl(reactProject, 'def456', reactSnapshotDir);
    const snapshotLink = await lstat(path.join(reactSnapshotDir, 'node_modules'));
    check(snapshotLink.isSymbolicLink(), 'react snapshot node_modules is a symlink');
    check(new URL(reactSnapshotUrl).port !== new URL(reactUrl).port, `react snapshot has its own Vite server ${reactSnapshotUrl}`);
    const snapshotOpen = await openInWrapper(page, config.studioOrigin, reactSnapshotUrl);
    report.push(`react snapshot (no vite.config, inline react plugin) load to painted: ${snapshotOpen.readyMs}ms`);
    await snapshotOpen.frame.waitForSelector('#title', { timeout: 15_000 });
    const snapshotLoc = await snapshotOpen.frame.locator('#title').getAttribute('data-studio-loc');
    check(snapshotLoc === 'src/App.tsx:4:7', `react snapshot h1 loc ${snapshotLoc}`);
    const shot = await service.screenshot(htmlUrl, { width: 800, height: 600 }, path.join(tmp, 'shot.png'));
    check(shot.endsWith('shot.png'), 'screenshot written');
  } finally {
    await browser.close().catch(() => undefined);
    wrapperServer.closeAllConnections();
    await new Promise<void>((resolve) => wrapperServer.close(() => resolve()));
    await service.stop();
  }
  const stillListening = await fetch(config.previewOrigin).then(() => true, () => false);
  check(!stillListening, 'html server closed by stop()');
  await rm(tmp, { recursive: true, force: true });
  console.log(report.join('\n'));
  console.log(failures.length === 0 ? 'DEV-CHECK OK' : `DEV-CHECK FAILED: ${failures.length}`);
  process.exit(failures.length === 0 ? 0 : 1);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
