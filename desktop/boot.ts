import path from "node:path";

import { app, BrowserWindow } from "electron";

import { loginShellPath } from "./env.js";
import type { GitChoice } from "./git-choice.js";
import { NativeShell } from "./native.js";
import { devLayout, packagedLayout } from "./paths.js";
import type { AppLayout } from "./paths.js";
import type { PortSet } from "./ports.js";
import { isRenderContents, RenderPool } from "./render-pool.js";
import { RenderHost } from "./render-rpc-host.js";
import { ServerLink } from "./server-link.js";
import type { ServerHandle } from "./server-process.js";
import { Updater } from "./updater.js";

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

interface BootState {
  prepared: Prepared | null;
  runtime: Runtime | null;
  serverStopped: boolean;
  serverStopping: boolean;
  windowsAllowed: boolean;
  updater: Updater | null;
  earlyLoginPath: Promise<string[]> | null;
}

interface BootHooks {
  focusWindow: (boot: Boot) => void;
  checkSetup: (boot: Boot) => void;
}

interface Boot {
  readonly ownDir: string;
  readonly layout: AppLayout;
  readonly startedAt: number;
  readonly marks: Record<string, number>;
  readonly state: BootState;
  readonly renderPool: RenderPool;
  readonly renderHost: RenderHost;
  readonly serverLink: ServerLink;
  readonly native: NativeShell;
  markBoot: (name: string) => void;
  startLoginShell: () => Promise<string[]>;
  studioWindows: () => BrowserWindow[];
  userDataFile: (...parts: string[]) => string;
  logFile: () => string;
  createUpdater: () => Updater;
}

const MS_PER_SECOND = 1000;

const createBoot = (ownDir: string, hooks: BootHooks): Boot => {
  const startedAt = Date.now() - Math.round(process.uptime() * MS_PER_SECOND);
  const marks: Record<string, number> = {};
  const state: BootState = {
    earlyLoginPath: null,
    prepared: null,
    runtime: null,
    serverStopped: false,
    serverStopping: false,
    updater: null,
    windowsAllowed: false,
  };
  let layout = devLayout(ownDir);
  if (app.isPackaged) {
    layout = packagedLayout(ownDir, process.resourcesPath);
  }
  const userDataFile = (...parts: string[]): string =>
    path.join(app.getPath("userData"), ...parts);
  const studioWindows = (): BrowserWindow[] =>
    BrowserWindow.getAllWindows().filter(
      (window) => !isRenderContents(window.webContents)
    );
  const markBoot = (name: string): void => {
    marks[name] ??= Date.now() - startedAt;
    console.log(`[desktop] boot ${name} ${marks[name]}ms`);
  };
  const startLoginShell = (): Promise<string[]> => {
    state.earlyLoginPath ??= loginShellPath(process.env).then((dirs) => {
      markBoot("loginShell");
      return dirs;
    });
    return state.earlyLoginPath;
  };
  const renderPool = new RenderPool(() =>
    [state.runtime?.url ?? ""].filter(Boolean)
  );
  const renderHost = new RenderHost(renderPool);
  const serverLink = new ServerLink(
    (finished) => void native.runFinished(finished),
    (notice) => native.mcpApproval(notice)
  );
  const native: NativeShell = new NativeShell({
    checkSetup: () => hooks.checkSetup(boot),
    focusWindow: () => hooks.focusWindow(boot),
    link: serverLink,
    pushDeviceToken: (token) => void serverLink.pushCloudSession(token),
    recentsFile: () => userDataFile("recent-projects.json"),
    studioOrigin: () => state.runtime?.url ?? null,
    studioWindows,
    updater: () => state.updater,
    windowsAllowed: () => state.windowsAllowed,
  });
  const boot: Boot = {
    createUpdater: () =>
      new Updater({
        activeRuns: () => serverLink.activeRuns().length,
        logFile: userDataFile("logs", "updater.log"),
        resourcesPath: process.resourcesPath,
      }),
    layout,
    logFile: () => userDataFile("logs", "server.log"),
    markBoot,
    marks,
    native,
    ownDir,
    renderHost,
    renderPool,
    serverLink,
    startLoginShell,
    startedAt,
    state,
    studioWindows,
    userDataFile,
  };
  return boot;
};

export { createBoot };
export type { Boot, BootHooks, BootState, Prepared, Runtime };
