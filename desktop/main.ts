import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { app, dialog, session, shell } from "electron";

import { LOCKED_EXIT_CODE } from "../src/server/platform/data-lock/index.js";
import { RENDER_IPC_ENV } from "../src/shared/render-rpc.js";
import { createBoot } from "./boot.js";
import type { Boot, Prepared, Runtime } from "./boot.js";
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
import { attachVault } from "./vault-host.js";
import { createMainWindow } from "./window.js";

declare const __STUDIO_RELEASE__: boolean | undefined;
const RELEASE_BUILD =
  typeof __STUDIO_RELEASE__ !== "undefined" && __STUDIO_RELEASE__ === true;

const OWN_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_NAME = "Design Studio";
const SETUP_MODE_ENV = "STUDIO_DESKTOP_SETUP";

function knownPath(): string {
  const home = process.env.HOME ?? os.homedir();
  return mergePath(
    knownPathDirs(home, nodeDirs(process.env, process.execPath))
  );
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
    if (choice.quit)
      dialog.showErrorBox(
        "Design Studio cannot use this data folder",
        choice.quit
      );
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
    loginPath: boot.startLoginShell(),
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
    STUDIO_LOGIN_SHELL_PATH: (await current.loginPath).join(":"),
    [RENDER_IPC_ENV]: "1",
    ...current.git.env,
    ...(boot.layout.resourcesDir
      ? { STUDIO_RESOURCES_DIR: boot.layout.resourcesDir }
      : {}),
  };
}

async function launchServer(boot: Boot, current: Prepared): Promise<Runtime> {
  const portsFile = boot.userDataFile("ports.json");
  const ports = await pickPorts(readSavedPorts(portsFile));
  savePorts(portsFile, ports);
  const url = `http://127.0.0.1:${ports.studio}`;
  const claudePath = (await locateClaude(boot, current))?.path ?? null;
  const env = buildServerEnv(
    process.env,
    current.knownPath,
    await serverOverrides(current, ports, claudePath)
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
  writeServerPid(boot.userDataFile("server.pid"), server.pid);
  serveChild(boot.renderHost, server.child);
  boot.serverLink.attach(server.child, url);
  attachVault(server.child);
  const next: Runtime = { ports, url, server, ready: false, claudePath };
  boot.state.runtime = next;
  void server.exited.then((exit) => onServerExit(boot, next, exit));
  await server.ready;
  boot.markBoot("serverReady");
  next.ready = true;
  return next;
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
  if (!boot.state.prepared) return;
  await waitForFree(previous, RESTART_PORT_WAIT_MS);
  try {
    const next = await launchServer(boot, boot.state.prepared);
    for (const window of boot.studioWindows()) void window.loadURL(next.url);
  } catch (error) {
    await failBoot(boot, error);
  }
}

async function onServerExit(
  boot: Boot,
  owner: Runtime,
  exit: ServerExit
): Promise<void> {
  clearServerPid(boot.userDataFile("server.pid"));
  if (
    boot.state.serverStopping ||
    boot.state.serverStopped ||
    !owner.ready ||
    boot.state.runtime !== owner
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

function openWindow(boot: Boot, current: Runtime): BrowserWindow {
  console.log(`[desktop] window: studio ${current.url}`);
  boot.markBoot("window");
  const window = createMainWindow({
    url: current.url,
    preload: path.join(boot.ownDir, "preload.cjs"),
    stateFile: boot.userDataFile("window-state.json"),
    version: app.getVersion(),
    boot: { startedAt: boot.startedAt, marks: { ...boot.marks } },
  });
  window.once("ready-to-show", () => boot.markBoot("readyToShow"));
  boot.native.trackWindow(window);
  return window;
}

function focusWindow(boot: Boot): void {
  if (!boot.state.windowsAllowed) return;
  const window = boot
    .studioWindows()
    .find((candidate) => candidate.webContents.getURL().startsWith("http"));
  if (!window) {
    if (boot.state.runtime) openWindow(boot, boot.state.runtime);
    return;
  }
  if (window.isMinimized()) window.restore();
  window.focus();
}

function stopServerThenQuit(boot: Boot, event: Electron.Event): void {
  if (boot.state.serverStopped || !boot.state.runtime) return;
  event.preventDefault();
  if (boot.state.serverStopping) return;
  boot.state.serverStopping = true;
  void boot.state.runtime.server.stop().finally(() => {
    boot.renderPool.destroy();
    boot.state.serverStopped = true;
    clearServerPid(boot.userDataFile("server.pid"));
    app.quit();
  });
}

async function failBoot(boot: Boot, error: unknown): Promise<void> {
  if (boot.state.serverStopping) return;
  const message = error instanceof Error ? error.message : String(error);
  console.error("[desktop] boot failed", error);
  boot.state.serverStopping = true;
  dialog.showErrorBox(
    "Design Studio could not start",
    `${message}\n\nLog: ${boot.logFile()}`
  );
  await boot.state.runtime?.server.stop();
  boot.state.serverStopped = true;
  app.exit(1);
}

async function restartIfClaudeMoved(
  boot: Boot,
  current: Prepared
): Promise<void> {
  const owner = boot.state.runtime;
  if (!owner?.ready || boot.state.serverStopping || boot.state.serverStopped)
    return;
  const claudePath = (await locateClaude(boot, current))?.path ?? null;
  if (claudePath === owner.claudePath) return;
  console.log(
    `[desktop] claude moved to ${claudePath ?? "nothing"}; restarting the server`
  );
  boot.state.runtime = null;
  await owner.server.stop();
  await restartServer(boot, owner.ports);
}

function checkSetup(boot: Boot): void {
  const current = boot.state.prepared;
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
  boot.state.updater = updater;
  boot.native.install();
  guardPermissions(session.defaultSession);
  app.on("web-contents-created", (_event, contents) => {
    if (!isRenderContents(contents))
      guardContents(contents, () => boot.state.runtime?.ports ?? null);
  });
  registerSetupIpc();
  await cleanStaleServer(boot.userDataFile("server.pid"));
  const prepared = await prepare(boot);
  boot.state.prepared = prepared;
  boot.markBoot("prepared");
  if (!prepared) {
    app.exit(0);
    return;
  }
  const [current] = await Promise.all([
    launchServer(boot, prepared),
    firstRun(boot, prepared),
  ]);
  if (boot.state.serverStopping || boot.state.serverStopped) return;
  await restartIfClaudeMoved(boot, prepared);
  boot.state.windowsAllowed = true;
  openWindow(boot, boot.state.runtime ?? current);
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
