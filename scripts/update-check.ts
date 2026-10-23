import { execFileSync, spawnSync } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { _electron as electron, type ElectronApplication } from '@playwright/test';
import type { Project, RunSummary } from '../src/shared/contracts.js';

const [sourceArg, feedArg, portArg] = process.argv.slice(2);
if (!sourceArg || !feedArg) throw new Error('usage: tsx scripts/update-check.ts <0.1.0 .app> <folder with latest-mac.yml and the 0.1.1 zip> [port]');
const sourceApp: string = sourceArg;
const feedDir: string = feedArg;
const PORT = Number(portArg ?? 8799);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function plistVersion(app: string): string {
  return execFileSync('/usr/libexec/PlistBuddy', ['-c', 'Print :CFBundleShortVersionString', path.join(app, 'Contents', 'Info.plist')], { encoding: 'utf8' }).trim();
}

function serveFeed(dir: string): Promise<{ close: () => void; hits: string[] }> {
  const hits: string[] = [];
  const server = createServer((req, res) => {
    const name = decodeURIComponent((req.url ?? '/').split('?')[0] ?? '/').replace(/^\/+/, '');
    hits.push(`${req.method} /${name}`);
    const file = path.join(dir, path.basename(name));
    if (!name || !existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'content-length': statSync(file).size, 'content-type': name.endsWith('.yml') ? 'text/yaml' : 'application/zip' });
    createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(PORT, '127.0.0.1', () => resolve({ close: () => server.close(), hits })));
}

function shipItLogs(): string {
  const dir = path.join(os.homedir(), 'Library', 'Caches', 'dev.designstudio.app.ShipIt');
  if (!existsSync(dir)) return '(no ShipIt cache folder)';
  return ['ShipIt_stderr.log', 'ShipIt_stdout.log']
    .map((name) => path.join(dir, name))
    .filter((file) => existsSync(file))
    .map((file) => `--- ${path.basename(file)}\n${readFileSync(file, 'utf8').split('\n').slice(-25).join('\n')}`)
    .join('\n');
}

type Recorded = { updates: { state: string; version?: string; detail?: string }[]; dialogs: { message?: string; detail?: string; buttons?: string[] }[] };

function testEnv(work: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) if (value !== undefined && key !== 'ELECTRON_RUN_AS_NODE') env[key] = value;
  return {
    ...env,
    STUDIO_AGENT: 'mock',
    STUDIO_DATA_DIR: path.join(work, 'data'),
    STUDIO_PROJECTS_DIR: path.join(work, 'Design Studio'),
    STUDIO_DESKTOP_USER_DATA: path.join(work, 'user-data'),
    STUDIO_DESKTOP_SETUP: 'skip',
    STUDIO_DESKTOP_NOTIFY: 'off',
    STUDIO_UPDATE_CHECK: 'off',
  };
}

async function studioApi(app: ElectronApplication): Promise<<T>(method: string, route: string, body?: unknown) => Promise<T>> {
  let page = await app.firstWindow();
  for (let i = 0; i < 120 && !page.url().startsWith('http'); i += 1) {
    await sleep(500);
    page = app.windows().find((w) => w.url().startsWith('http')) ?? page;
  }
  const origin = new URL(page.url()).origin;
  const token = (await page.locator('meta[name="studio-token"]').getAttribute('content')) ?? '';
  return async <T>(method: string, route: string, body?: unknown): Promise<T> => {
    const res = await fetch(`${origin}${route}`, { method, headers: { 'x-studio-token': token, 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    if (!res.ok) throw new Error(`${method} ${route} ${res.status}`);
    return (await res.json()) as T;
  };
}

async function recordUpdates(app: ElectronApplication): Promise<() => Promise<Recorded>> {
  await app.evaluate(({ app: electronApp, dialog }) => {
    const rec = { updates: [] as unknown[], dialogs: [] as { message?: string; detail?: string; buttons?: string[] }[] };
    (globalThis as unknown as { __rec: typeof rec }).__rec = rec;
    electronApp.on('studio-update' as 'ready', (event: unknown) => rec.updates.push(event));
    dialog.showMessageBox = (async (...args: unknown[]) => {
      const options = (args.length > 1 ? args[1] : args[0]) as { message?: string; detail?: string; buttons?: string[] };
      rec.dialogs.push({ message: options.message, detail: options.detail, buttons: options.buttons });
      return { response: 0, checkboxChecked: false };
    }) as typeof dialog.showMessageBox;
  });
  return () => app.evaluate(() => (globalThis as unknown as { __rec: Recorded }).__rec);
}

async function startSlowRun(call: Awaited<ReturnType<typeof studioApi>>): Promise<() => Promise<number>> {
  const { project } = await call<{ project: Project }>('POST', '/api/projects', { prompt: 'Update check page', kind: 'html' });
  const main = project.directions[0];
  if (!main) throw new Error('no direction');
  const running = async () => (await call<RunSummary[]>('GET', `/api/projects/${project.id}/runs`)).filter((run) => run.status === 'running').length;
  for (let i = 0; i < 60 && (await running()) > 0; i += 1) await sleep(500);
  await call('POST', `/api/projects/${project.id}/d/${main.id}/runs`, { prompt: 'Slow edit during update [slow]', mode: 'edit' });
  return running;
}

async function waitForState(rec: () => Promise<Recorded>, done: (state: Recorded) => boolean, stop: () => boolean): Promise<Recorded> {
  let state = await rec();
  for (let i = 0; i < 240 && !stop() && !done(state); i += 1) {
    await sleep(500);
    state = await rec().catch(() => state);
  }
  return state;
}

async function driveUpdate(app: ElectronApplication, exited: () => boolean): Promise<void> {
  const call = await studioApi(app);
  const rec = await recordUpdates(app);
  const running = await startSlowRun(call);
  console.log('[update] started a slow run, now checking for updates from the menu');
  await app.evaluate(({ Menu }) => Menu.getApplicationMenu()?.getMenuItemById('check-updates')?.click());
  const deferred = await waitForState(rec, (state) => state.updates.some((event) => ['deferred', 'installing', 'error'].includes(event.state)), exited);
  console.log(`[update] events so far: ${JSON.stringify(deferred.updates)}`);
  console.log(`[update] dialogs so far: ${JSON.stringify(deferred.dialogs)}`);
  console.log(`[update] active runs while deferred: ${await running()}; app still running: ${!exited()}`);
  const final = await waitForState(rec, (state) => state.updates.some((event) => event.state === 'error') && state.dialogs.length >= 3, exited);
  console.log(`[update] events: ${JSON.stringify(final.updates)}`);
  console.log(`[update] dialogs: ${JSON.stringify(final.dialogs)}`);
}

async function versionAfter(appCopy: string): Promise<string> {
  let version = plistVersion(appCopy);
  for (let i = 0; i < 60 && version !== '0.1.1'; i += 1) {
    await sleep(1000);
    version = plistVersion(appCopy);
  }
  return version;
}

function updaterLog(work: string): string {
  const file = path.join(work, 'user-data', 'logs', 'updater.log');
  return existsSync(file) ? readFileSync(file, 'utf8').split('\n').slice(-30).join('\n') : '(none)';
}

function stopRelaunched(appCopy: string): void {
  const relaunched = spawnSync('pgrep', ['-f', appCopy], { encoding: 'utf8' }).stdout.trim();
  if (!relaunched) return;
  console.log(`[update] app pids still running ${relaunched.split('\n').join(' ')}: stopping them`);
  spawnSync('pkill', ['-TERM', '-f', appCopy]);
}

async function main(): Promise<void> {
  const work = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'studio update check ')));
  const appCopy = path.join(work, 'Applications', 'Design Studio.app');
  mkdirSync(path.dirname(appCopy), { recursive: true });
  execFileSync('ditto', [sourceApp, appCopy]);
  console.log(`[update] old app ${appCopy} version ${plistVersion(appCopy)}`);
  const feed = await serveFeed(feedDir);
  const app = await electron.launch({ executablePath: path.join(appCopy, 'Contents', 'MacOS', 'Design Studio'), args: [], env: testEnv(work), timeout: 120_000 });
  let exited = false;
  app.process().on('exit', () => {
    exited = true;
  });
  await driveUpdate(app, () => exited).catch((error: unknown) => console.error('[update] driver error', error));
  for (let i = 0; i < 120 && !exited; i += 1) await sleep(500);
  console.log(`[update] app process exited: ${exited}`);
  console.log(`[update] app version on disk after: ${await versionAfter(appCopy)}`);
  console.log(`[update] feed requests: ${feed.hits.join(', ')}`);
  console.log(`[update] updater log:\n${updaterLog(work)}`);
  console.log(`[update] ${shipItLogs()}`);
  stopRelaunched(appCopy);
  if (!exited) await app.close().catch(() => undefined);
  feed.close();
  console.log(`[update] work ${work}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
