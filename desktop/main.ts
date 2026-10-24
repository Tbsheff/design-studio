import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { app, BrowserWindow, dialog, session, shell } from 'electron';
import { LOCKED_EXIT_CODE } from '../src/server/store/data-lock.js';
import { bundledClaude, expectedClaudeVersion, resolveClaude, type ClaudeLocation } from './claude-cli.js';
import { chooseDataDir } from './data-choice.js';
import { baseEnv, buildServerEnv, knownPathDirs, loginShellPath, mergePath, nodeDirs } from './env.js';
import { openSetupWindow, registerSetupIpc, setupNeeded } from './first-run.js';
import { chooseGit, FORCE_GIT_ENV, type GitChoice } from './git-choice.js';
import { guardContents, guardPermissions } from './navigation.js';
import { claudeBinary, devLayout, dugiteDir, packagedLayout, repoDataDir } from './paths.js';
import { pickPorts, readSavedPorts, savePorts, waitForFree, type PortSet } from './ports.js';
import { startServer, type ServerExit, type ServerHandle } from './server-process.js';
import type { CheckInputs, ClaudeSetup } from './setup-checks.js';
import { cleanStaleServer, clearServerPid, writeServerPid } from './stale-server.js';
import { createMainWindow } from './window.js';
import { isRenderContents, RenderPool } from './render-pool.js';
import { RenderHost, serveChild } from './render-rpc-host.js';
import { RENDER_IPC_ENV } from '../src/shared/render-rpc.js';
import { NativeShell } from './native.js';
import { ServerLink } from './server-link.js';
import { Updater } from './updater.js';

declare const __STUDIO_RELEASE__: boolean | undefined;
const RELEASE_BUILD = typeof __STUDIO_RELEASE__ !== 'undefined' && __STUDIO_RELEASE__ === true;

const PROCESS_STARTED_AT = Date.now() - Math.round(process.uptime() * 1000);
const bootMarks: Record<string, number> = {};

function markBoot(name: string): void {
  bootMarks[name] ??= Date.now() - PROCESS_STARTED_AT;
  console.log(`[desktop] boot ${name} ${bootMarks[name]}ms`);
}

const OWN_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_NAME = 'Design Studio';
const SETUP_MODE_ENV = 'STUDIO_DESKTOP_SETUP';
const layout = app.isPackaged ? packagedLayout(OWN_DIR, process.resourcesPath) : devLayout(OWN_DIR);

interface Prepared {
  dataDir: string;
  git: GitChoice;
  knownPath: string;
  loginPath: Promise<string[]>;
}

interface Runtime {
  ports: PortSet;
  url: string;
  server: ServerHandle;
  ready: boolean;
  claudePath: string | null;
}

let prepared: Prepared | null = null;
let runtime: Runtime | null = null;
let serverStopped = false;
let serverStopping = false;
let windowsAllowed = false;
const renderPool = new RenderPool(() => (runtime ? [runtime.url] : []));
const renderHost = new RenderHost(renderPool);
let updater: Updater | null = null;
const serverLink = new ServerLink((finished) => void native.runFinished(finished));
const native = new NativeShell({
  link: serverLink,
  studioWindows: () => studioWindows(),
  studioOrigin: () => runtime?.url ?? null,
  windowsAllowed: () => windowsAllowed,
  focusWindow: () => focusWindow(),
  checkSetup: () => checkSetup(),
  updater: () => updater,
  recentsFile: () => userDataFile('recent-projects.json'),
});

function studioWindows(): BrowserWindow[] {
  return BrowserWindow.getAllWindows().filter((window) => !isRenderContents(window.webContents));
}

function userDataFile(...parts: string[]): string {
  return path.join(app.getPath('userData'), ...parts);
}

function logFile(): string {
  return userDataFile('logs', 'server.log');
}

function knownPath(): string {
  const home = process.env.HOME ?? os.homedir();
  return mergePath(knownPathDirs(home, nodeDirs(process.env, process.execPath)));
}

async function prepare(): Promise<Prepared | null> {
  const fromEnv = process.env.STUDIO_DATA_DIR;
  const preferred = fromEnv ? path.resolve(fromEnv) : layout.packaged ? userDataFile('studio-data') : repoDataDir(layout);
  const choice = await chooseDataDir({ preferred, separate: userDataFile('studio-data-desktop'), explicit: !!fromEnv });
  if ('quit' in choice) {
    if (choice.quit) dialog.showErrorBox('Design Studio cannot use this data folder', choice.quit);
    return null;
  }
  const git = await chooseGit(dugiteDir(layout), process.env[FORCE_GIT_ENV]);
  return { dataDir: choice.dir, git, knownPath: knownPath(), loginPath: loginShellPath(process.env) };
}

async function searchPath(current: Prepared): Promise<string[]> {
  return [...(await current.loginPath), ...current.knownPath.split(':')];
}

async function locateClaude(current: Prepared): Promise<ClaudeLocation | null> {
  if (!layout.packaged && !process.env.STUDIO_CLAUDE_PATH) return bundledClaude(claudeBinary(layout));
  return resolveClaude({ env: process.env, home: process.env.HOME ?? os.homedir(), searchPath: await searchPath(current) });
}

async function claudeSetup(current: Prepared): Promise<ClaudeSetup> {
  const location = await locateClaude(current);
  console.log(`[desktop] claude: ${location ? `${location.path} (${location.source}, real ${location.realPath})` : 'not found'}`);
  return { location, expectedVersion: expectedClaudeVersion(layout.modulesDir) };
}

async function setupInputs(current: Prepared): Promise<CheckInputs> {
  const claudeEnv = baseEnv(process.env, mergePath(await searchPath(current)));
  return { git: current.git, claude: await claudeSetup(current), claudeEnv, dataDir: current.dataDir, env: process.env };
}

async function serverOverrides(current: Prepared, ports: PortSet, claudePath: string | null): Promise<Record<string, string>> {
  return {
    STUDIO_PORT: String(ports.studio),
    STUDIO_PREVIEW_PORT: String(ports.preview),
    STUDIO_VITE_PORT_BASE: String(ports.viteBase),
    STUDIO_DATA_DIR: current.dataDir,
    ...(claudePath ? { STUDIO_CLAUDE_PATH: claudePath } : {}),
    STUDIO_PARENT_PID: String(process.pid),
    STUDIO_LOGIN_SHELL_PATH: (await current.loginPath).join(':'),
    [RENDER_IPC_ENV]: '1',
    ...current.git.env,
    ...(layout.resourcesDir ? { STUDIO_RESOURCES_DIR: layout.resourcesDir } : {}),
  };
}

async function launchServer(current: Prepared): Promise<Runtime> {
  const portsFile = userDataFile('ports.json');
  const ports = await pickPorts(readSavedPorts(portsFile));
  savePorts(portsFile, ports);
  const url = `http://127.0.0.1:${ports.studio}`;
  const claudePath = (await locateClaude(current))?.path ?? null;
  const env = buildServerEnv(process.env, current.knownPath, await serverOverrides(current, ports, claudePath));
  const server = startServer({ cwd: layout.serverCwd, args: layout.serverArgs, execPath: process.execPath, env, studioOrigin: url, logFile: logFile(), echo: !layout.packaged });
  markBoot('serverSpawned');
  writeServerPid(userDataFile('server.pid'), server.pid);
  serveChild(renderHost, server.child);
  serverLink.attach(server.child, url);
  const next: Runtime = { ports, url, server, ready: false, claudePath };
  runtime = next;
  void server.exited.then((exit) => onServerExit(next, exit));
  await server.ready;
  markBoot('serverReady');
  next.ready = true;
  return next;
}

function exitText(exit: ServerExit): string {
  if (exit.code === LOCKED_EXIT_CODE) return 'Another studio server took the data folder lock.';
  return exit.signal ? `It stopped on signal ${exit.signal}.` : `It exited with code ${exit.code ?? 'unknown'}.`;
}

const RESTART_PORT_WAIT_MS = 5000;

async function restartServer(previous: PortSet): Promise<void> {
  if (!prepared) return;
  await waitForFree(previous, RESTART_PORT_WAIT_MS);
  try {
    const next = await launchServer(prepared);
    for (const window of studioWindows()) void window.loadURL(next.url);
  } catch (error) {
    await failBoot(error);
  }
}

async function onServerExit(owner: Runtime, exit: ServerExit): Promise<void> {
  clearServerPid(userDataFile('server.pid'));
  if (serverStopping || serverStopped || !owner.ready || runtime !== owner) return;
  const { response } = await dialog.showMessageBox({
    type: 'error',
    message: 'The studio server stopped',
    detail: `${exitText(exit)}\n\nLog: ${logFile()}`,
    buttons: ['Restart', 'Restart and Show Log', 'Quit'],
    defaultId: 0,
    cancelId: 2,
  });
  if (response === 1) shell.showItemInFolder(logFile());
  if (response === 2) app.quit();
  else await restartServer(owner.ports);
}

function openWindow(current: Runtime): BrowserWindow {
  console.log(`[desktop] window: studio ${current.url}`);
  markBoot('window');
  const window = createMainWindow({ url: current.url, preload: path.join(OWN_DIR, 'preload.cjs'), stateFile: userDataFile('window-state.json'), version: app.getVersion(), boot: { startedAt: PROCESS_STARTED_AT, marks: { ...bootMarks } } });
  window.once('ready-to-show', () => markBoot('readyToShow'));
  native.trackWindow(window);
  return window;
}

function focusWindow(): void {
  if (!windowsAllowed) return;
  const window = studioWindows().find((candidate) => candidate.webContents.getURL().startsWith('http'));
  if (!window) {
    if (runtime) openWindow(runtime);
    return;
  }
  if (window.isMinimized()) window.restore();
  window.focus();
}

function stopServerThenQuit(event: Electron.Event): void {
  if (serverStopped || !runtime) return;
  event.preventDefault();
  if (serverStopping) return;
  serverStopping = true;
  void runtime.server.stop().finally(() => {
    renderPool.destroy();
    serverStopped = true;
    clearServerPid(userDataFile('server.pid'));
    app.quit();
  });
}

async function failBoot(error: unknown): Promise<void> {
  if (serverStopping) return;
  const message = error instanceof Error ? error.message : String(error);
  console.error('[desktop] boot failed', error);
  serverStopping = true;
  dialog.showErrorBox('Design Studio could not start', `${message}\n\nLog: ${logFile()}`);
  await runtime?.server.stop();
  serverStopped = true;
  app.exit(1);
}

async function restartIfClaudeMoved(current: Prepared): Promise<void> {
  const owner = runtime;
  if (!owner?.ready || serverStopping || serverStopped) return;
  const claudePath = (await locateClaude(current))?.path ?? null;
  if (claudePath === owner.claudePath) return;
  console.log(`[desktop] claude moved to ${claudePath ?? 'nothing'}; restarting the server`);
  runtime = null;
  await owner.server.stop();
  await restartServer(owner.ports);
}

function checkSetup(): void {
  const current = prepared;
  if (current) void openSetupWindow({ ownDir: OWN_DIR, inputs: () => setupInputs(current), continueLabel: 'Done' }).then(() => restartIfClaudeMoved(current));
}

async function firstRun(current: Prepared): Promise<void> {
  const mode = process.env[SETUP_MODE_ENV];
  if (mode === 'skip') return;
  const { needed } = await setupNeeded(await setupInputs(current));
  if (needed || mode === 'always') await openSetupWindow({ ownDir: OWN_DIR, inputs: () => setupInputs(current), continueLabel: 'Continue' });
}

async function boot(): Promise<void> {
  await app.whenReady();
  markBoot('appReady');
  updater = new Updater({ activeRuns: () => serverLink.activeRuns().length, logFile: userDataFile('logs', 'updater.log'), resourcesPath: process.resourcesPath });
  native.install();
  guardPermissions(session.defaultSession);
  app.on('web-contents-created', (_event, contents) => {
    if (!isRenderContents(contents)) guardContents(contents, () => runtime?.ports ?? null);
  });
  registerSetupIpc();
  await cleanStaleServer(userDataFile('server.pid'));
  prepared = await prepare();
  markBoot('prepared');
  if (!prepared) {
    app.exit(0);
    return;
  }
  const [current] = await Promise.all([launchServer(prepared), firstRun(prepared)]);
  if (serverStopping || serverStopped) return;
  await restartIfClaudeMoved(prepared);
  windowsAllowed = true;
  openWindow(runtime ?? current);
  updater.start();
}

function registerLifecycle(): void {
  app.on('second-instance', (_event, argv) => native.secondInstance(argv));
  app.on('activate', focusWindow);
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
  app.on('before-quit', stopServerThenQuit);
  process.on('SIGINT', () => app.quit());
  process.on('SIGTERM', () => app.quit());
}

function applyUserDataOverride(): void {
  const override = process.env.STUDIO_DESKTOP_USER_DATA;
  if (override) app.setPath('userData', path.resolve(override));
}

function startApp(): void {
  app.commandLine.appendSwitch('force-color-profile', 'srgb');
  app.setName(APP_NAME);
  applyUserDataOverride();
  if (app.requestSingleInstanceLock()) {
    native.registerEarly();
    registerLifecycle();
    boot().catch(failBoot);
  } else {
    app.quit();
  }
}

if (!RELEASE_BUILD && process.env.STUDIO_RENDER_HOST_MODE === '1') void import('./render-host.js');
else startApp();
