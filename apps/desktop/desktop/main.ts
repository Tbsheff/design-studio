import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { app, dialog, session, shell } from "electron";
import type { BrowserWindow } from "electron";

import { LOCKED_EXIT_CODE } from "../src/server/platform/data-lock/index.js";
import { RENDER_IPC_ENV } from "../src/shared/render-rpc.js";
import { createBoot } from "./boot.js";
import type { Boot, Prepared, ServerSession } from "./boot.js";
import {
  bundledClaude,
  expectedClaudeVersion,
  resolveClaude,
} from "./claude-cli.js";
import type { ClaudeLocation } from "./claude-cli.js";
import { chooseDataDir } from "./data-choice.js";
import {
  baseEnv,
  buildServerEnv,
  knownPathDirs,
  mergePath,
  nodeDirs,
  readSavedLoginPath,
  saveLoginPath,
  toFirstLaunchPath,
} from "./env.js";
import { openSetupWindow, registerSetupIpc, setupNeeded } from "./first-run.js";
import { chooseGit, FORCE_GIT_ENV } from "./git-choice.js";
import { guardContents, guardPermissions } from "./navigation.js";
import { claudeBinary, dugiteDir, repoDataDir } from "./paths.js";
import { pickPorts, readSavedPorts, savePorts, waitForFree } from "./ports.js";
import type { PortSet } from "./ports.js";
import { isRenderContents } from "./render-pool.js";
import { serveChild } from "./render-rpc-host.js";
import { startServer } from "./server-process.js";
import type { ServerExit } from "./server-process.js";
import type { CheckInputs, ClaudeSetup } from "./setup-checks.js";
import {
  cleanStaleServer,
  clearServerPid,
  writeServerPid,
} from "./stale-server.js";
import { trustStudioOrigin, UI_SECRET } from "./ui-trust.js";
import { attachVault } from "./vault-host.js";
import { createMainWindow } from "./window.js";

declare const __STUDIO_RELEASE__: boolean | undefined;
const RELEASE_BUILD =
  typeof __STUDIO_RELEASE__ !== "undefined" && __STUDIO_RELEASE__ === true;

const OWN_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_NAME = "Design Studio";
const SETUP_MODE_ENV = "STUDIO_DESKTOP_SETUP";
const LOGIN_PATH_FILE = "login-path.txt";
const COMPILE_CACHE_DIR = "compile-cache";

const knownPath = (): string => {
  const source = process.env;
  const home = source.HOME ?? os.homedir();

  return mergePath(knownPathDirs(home, nodeDirs(source, process.execPath)));
};

async function saveLivePath(
  file: string,
  live: Promise<string[]>
): Promise<void> {
  try {
    await saveLoginPath(file, await live);
  } catch (error) {
    console.error("[desktop] cannot save the login shell PATH", error);
  }
}

async function toServerLoginPath(boot: Boot): Promise<string[]> {
  const file = boot.userDataFile(LOGIN_PATH_FILE);
  const live = boot.startLoginShell();
  void saveLivePath(file, live);
  const saved = await readSavedLoginPath(file);

  if (saved.length > 0) {
    return saved;
  }

  const fast = await toFirstLaunchPath(process.env, process.execPath);

  return fast ?? live;
}

function compileCacheEnv(boot: Boot): Record<string, string> {
  return boot.layout.packaged
    ? { NODE_COMPILE_CACHE: boot.userDataFile(COMPILE_CACHE_DIR) }
    : {};
}

async function prepare(boot: Boot): Promise<Prepared | null> {
  const fromEnv = process.env.STUDIO_DATA_DIR;
  const preferred = fromEnv
    ? path.resolve(fromEnv)
    : boot.layout.packaged
      ? boot.userDataFile("studio-data")
      : repoDataDir(boot.layout);
  const choice = await chooseDataDir({
    preferred,
    separate: boot.userDataFile("studio-data-desktop"),
    explicit: Boolean(fromEnv),
  });
  if ("quit" in choice) {
    if (choice.quit) {
      dialog.showErrorBox(
        "Design Studio cannot use this data folder",
        choice.quit
      );
    }
    return null;
  }
  const git = await chooseGit(
    dugiteDir(boot.layout),
    process.env[FORCE_GIT_ENV]
  );
  return {
    dataDir: choice.dir,
    git,
    knownPath: knownPath(),
    loginPath: toServerLoginPath(boot),
  };
}

async function searchPath(current: Prepared): Promise<string[]> {
  return [...(await current.loginPath), ...current.knownPath.split(":")];
}

async function locateClaude(
  boot: Boot,
  current: Prepared
): Promise<ClaudeLocation | null> {
  if (!boot.layout.packaged && !process.env.STUDIO_CLAUDE_PATH)
    return bundledClaude(claudeBinary(boot.layout));
  return resolveClaude({
    env: process.env,
    home: process.env.HOME ?? os.homedir(),
    searchPath: await searchPath(current),
  });
}

async function claudeSetup(
  boot: Boot,
  current: Prepared
): Promise<ClaudeSetup> {
  const location = await locateClaude(boot, current);
  console.log(
    `[desktop] claude: ${location ? `${location.path} (${location.source}, real ${location.realPath})` : "not found"}`
  );
  return {
    location,
    expectedVersion: expectedClaudeVersion(boot.layout.modulesDir),
  };
}

async function setupInputs(
  boot: Boot,
  current: Prepared
): Promise<CheckInputs> {
  const claudeEnv = baseEnv(process.env, mergePath(await searchPath(current)));
  return {
    git: current.git,
    claude: await claudeSetup(boot, current),
    claudeEnv,
    dataDir: current.dataDir,
    env: process.env,
  };
}

async function serverOverrides(
  boot: Boot,
  current: Prepared,
  ports: PortSet,
  claudePath: string | null
): Promise<Record<string, string>> {
  return {
    STUDIO_PORT: String(ports.studio),
    STUDIO_PREVIEW_PORT: String(ports.preview),
    STUDIO_VITE_PORT_BASE: String(ports.viteBase),
    STUDIO_DATA_DIR: current.dataDir,
    ...(claudePath ? { STUDIO_CLAUDE_PATH: claudePath } : {}),
    STUDIO_PARENT_PID: String(process.pid),
    STUDIO_UI_SECRET: UI_SECRET,
    STUDIO_LOGIN_SHELL_PATH: (await current.loginPath).join(":"),
    [RENDER_IPC_ENV]: "1",
    ...compileCacheEnv(boot),
    ...current.git.env,
    ...(boot.layout.resourcesDir
      ? { STUDIO_RESOURCES_DIR: boot.layout.resourcesDir }
      : {}),
  };
}

const ignoreSpawn = (): null => null;

async function launchServer(
  boot: Boot,
  current: Prepared,
  onSpawned: () => void
): Promise<ServerSession> {
  const portsFile = boot.userDataFile("ports.json");
  const ports = await pickPorts(readSavedPorts(portsFile));
  savePorts(portsFile, ports);
  const url = `http://127.0.0.1:${ports.studio}`;
  trustStudioOrigin(session.defaultSession, url);
  const claudePath = (await locateClaude(boot, current))?.path ?? null;
  const env = buildServerEnv(
    process.env,
    current.knownPath,
    await serverOverrides(boot, current, ports, claudePath)
  );
  const server = startServer({
    cwd: boot.layout.serverCwd,
    args: boot.layout.serverArgs,
    execPath: process.execPath,
    env,
    studioOrigin: url,
    logFile: boot.logFile(),
    echo: !boot.layout.packaged,
  });
  boot.markBoot("serverSpawned");

  onSpawned();
  writeServerPid(boot.userDataFile("server.pid"), server.pid);
  serveChild(boot.renderHost, server.child);
  boot.serverLink.attach(server.child, url);
  attachVault(server.child);
  const next: ServerSession = {
    claudePath,
    isReady: false,
    ports,
    server,
    url,
  };
  boot.setSession(next);
  void server.exited.then((exit) => onServerExit(boot, next, exit));
  await server.ready;
  boot.markBoot("serverReady");
  boot.markSessionReady(server);
  return { ...next, isReady: true };
}

function exitText(exit: ServerExit): string {
  if (exit.code === LOCKED_EXIT_CODE)
    return "Another studio server took the data folder lock.";
  return exit.signal
    ? `It stopped on signal ${exit.signal}.`
    : `It exited with code ${exit.code ?? "unknown"}.`;
}

const RESTART_PORT_WAIT_MS = 5000;

async function restartServer(boot: Boot, previous: PortSet): Promise<void> {
  const { prepared } = boot.state();
  if (!prepared) return;
  await waitForFree(previous, RESTART_PORT_WAIT_MS);
  try {
    const next = await launchServer(boot, prepared, ignoreSpawn);
    for (const window of boot.studioWindows()) void window.loadURL(next.url);
  } catch (error) {
    await failBoot(boot, error);
  }
}

async function onServerExit(
  boot: Boot,
  owner: ServerSession,
  exit: ServerExit
): Promise<void> {
  clearServerPid(boot.userDataFile("server.pid"));
  if (
    boot.state().isServerStopping ||
    boot.state().isServerStopped ||
    !boot.isLiveSession(owner.server)
  )
    return;
  const { response } = await dialog.showMessageBox({
    type: "error",
    message: "The studio server stopped",
    detail: `${exitText(exit)}\n\nLog: ${boot.logFile()}`,
    buttons: ["Restart", "Restart and Show Log", "Quit"],
    defaultId: 0,
    cancelId: 2,
  });
  if (response === 1) shell.showItemInFolder(boot.logFile());
  if (response === 2) app.quit();
  else await restartServer(boot, owner.ports);
}

const createStudioWindow = (boot: Boot, url: string | null): BrowserWindow => {
  const window = createMainWindow({
    url,
    preload: path.join(boot.ownDir, "preload.cjs"),
    stateFile: boot.userDataFile("window-state.json"),
    version: app.getVersion(),
    boot: { startedAt: boot.startedAt, marks: { ...boot.marks } },
  });
  window.once("ready-to-show", () => boot.markBoot("readyToShow"));

  return window;
};

function openWindow(boot: Boot, current: ServerSession): BrowserWindow {
  console.log(`[desktop] window: studio ${current.url}`);
  boot.markBoot("window");
  const window = createStudioWindow(boot, current.url);
  boot.native.trackWindow(window);
  return window;
}

const showEarlyWindow = (
  boot: Boot,
  window: BrowserWindow,
  current: ServerSession
): void => {
  if (window.isDestroyed()) {
    openWindow(boot, current);

    return;
  }

  boot.markBoot("window");
  boot.native.trackWindow(window);
  void window.loadURL(current.url);
};

function focusWindow(boot: Boot): void {
  if (!boot.state().isWindowsAllowed) return;
  const window = boot
    .studioWindows()
    .find((candidate) => candidate.webContents.getURL().startsWith("http"));
  if (!window) {
    const current = boot.state().session;
    if (current) openWindow(boot, current);
    return;
  }
  if (window.isMinimized()) window.restore();
  window.focus();
}

function stopServerThenQuit(boot: Boot, event: Electron.Event): void {
  const current = boot.state().session;
  if (boot.state().isServerStopped || !current) return;
  event.preventDefault();
  if (boot.state().isServerStopping) return;
  boot.markServerStopping();
  void current.server.stop().finally(() => {
    boot.renderPool.destroy();
    boot.markServerStopped();
    clearServerPid(boot.userDataFile("server.pid"));
    app.quit();
  });
}

async function failBoot(boot: Boot, error: unknown): Promise<void> {
  if (boot.state().isServerStopping) return;
  const message = error instanceof Error ? error.message : String(error);
  console.error("[desktop] boot failed", error);
  boot.markServerStopping();
  dialog.showErrorBox(
    "Design Studio could not start",
    `${message}\n\nLog: ${boot.logFile()}`
  );
  await boot.state().session?.server.stop();
  boot.markServerStopped();
  app.exit(1);
}

async function restartIfClaudeMoved(
  boot: Boot,
  current: Prepared
): Promise<void> {
  const owner = boot.state().session;
  if (
    !owner?.isReady ||
    boot.state().isServerStopping ||
    boot.state().isServerStopped
  )
    return;
  const claudePath = (await locateClaude(boot, current))?.path ?? null;
  if (claudePath === owner.claudePath) return;
  console.log(
    `[desktop] claude moved to ${claudePath ?? "nothing"}; restarting the server`
  );
  boot.setSession(null);
  await owner.server.stop();
  await restartServer(boot, owner.ports);
}

function checkSetup(boot: Boot): void {
  const current = boot.state().prepared;
  if (current)
    void openSetupWindow({
      ownDir: boot.ownDir,
      inputs: () => setupInputs(boot, current),
      continueLabel: "Done",
    }).then(() => restartIfClaudeMoved(boot, current));
}

async function firstRun(boot: Boot, current: Prepared): Promise<void> {
  const mode = process.env[SETUP_MODE_ENV];
  if (mode === "skip") return;
  const { needed } = await setupNeeded(await setupInputs(boot, current));
  if (needed || mode === "always")
    await openSetupWindow({
      ownDir: boot.ownDir,
      inputs: () => setupInputs(boot, current),
      continueLabel: "Continue",
    });
}

async function runBoot(boot: Boot): Promise<void> {
  await app.whenReady();
  boot.markBoot("appReady");
  const updater = boot.createUpdater();
  boot.setUpdater(updater);
  boot.native.install();
  guardPermissions(session.defaultSession);
  app.on("web-contents-created", (_event, contents) => {
    if (!isRenderContents(contents))
      guardContents(contents, () => boot.state().session?.ports ?? null);
  });
  registerSetupIpc();
  await cleanStaleServer(boot.userDataFile("server.pid"));
  const prepared = await prepare(boot);
  boot.setPrepared(prepared);
  boot.markBoot("prepared");
  if (!prepared) {
    app.exit(0);
    return;
  }

  const spawned = Promise.withResolvers<null>();
  const launching = launchServer(boot, prepared, () => spawned.resolve(null));
  const started = Promise.all([launching, firstRun(boot, prepared)]);
  await Promise.race([spawned.promise, started]);

  const early = createStudioWindow(boot, null);

  boot.markBoot("earlyWindow");

  const [current] = await started;

  if (boot.state().isServerStopping || boot.state().isServerStopped) return;
  await restartIfClaudeMoved(boot, prepared);
  boot.allowWindows();
  showEarlyWindow(boot, early, boot.state().session ?? current);
  updater.start();
}

function registerLifecycle(boot: Boot): void {
  app.on("second-instance", (_event, argv) => boot.native.secondInstance(argv));
  app.on("activate", () => focusWindow(boot));
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
  app.on("before-quit", (event) => stopServerThenQuit(boot, event));
  process.on("SIGINT", () => app.quit());
  process.on("SIGTERM", () => app.quit());
}

function applyUserDataOverride(): void {
  const override = process.env.STUDIO_DESKTOP_USER_DATA;
  if (override) app.setPath("userData", path.resolve(override));
}

async function failOnReject(boot: Boot, pending: Promise<void>): Promise<void> {
  try {
    await pending;
  } catch (error) {
    await failBoot(boot, error);
  }
}

function startApp(): void {
  const boot = createBoot(OWN_DIR, { focusWindow, checkSetup });
  app.commandLine.appendSwitch("force-color-profile", "srgb");
  app.setName(APP_NAME);
  applyUserDataOverride();
  if (app.requestSingleInstanceLock()) {
    boot.native.registerEarly();
    registerLifecycle(boot);
    void boot.startLoginShell();
    void failOnReject(boot, runBoot(boot));
  } else {
    app.quit();
  }
}

if (!RELEASE_BUILD && process.env.STUDIO_RENDER_HOST_MODE === "1")
  void import("./render-host.js");
else startApp();
