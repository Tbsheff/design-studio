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
  readonly dataDir: string;
  readonly git: GitChoice;
  readonly knownPath: string;
  readonly loginPath: Promise<string[]>;
}

interface ServerSession {
  readonly claudePath: string | null;
  readonly isReady: boolean;
  readonly ports: PortSet;
  readonly server: ServerHandle;
  readonly url: string;
}

interface BootState {
  readonly earlyLoginPath: Promise<string[]> | null;
  readonly isServerStopped: boolean;
  readonly isServerStopping: boolean;
  readonly isWindowsAllowed: boolean;
  readonly prepared: Prepared | null;
  readonly session: ServerSession | null;
  readonly updater: Updater | null;
}

interface BootHooks {
  readonly checkSetup: (boot: Boot) => void;
  readonly focusWindow: (boot: Boot) => void;
}

interface BootTransitions {
  readonly allowWindows: () => void;
  readonly isLiveSession: (server: ServerHandle) => boolean;
  readonly markServerStopped: () => void;
  readonly markServerStopping: () => void;
  readonly markSessionReady: (server: ServerHandle) => void;
  readonly setPrepared: (prepared: Prepared | null) => void;
  readonly setSession: (session: ServerSession | null) => void;
  readonly setUpdater: (updater: Updater) => void;
}

interface Boot extends BootTransitions {
  readonly createUpdater: () => Updater;
  readonly layout: AppLayout;
  readonly logFile: () => string;
  readonly markBoot: (name: string) => void;
  readonly marks: Readonly<Record<string, number>>;
  readonly native: NativeShell;
  readonly ownDir: string;
  readonly renderHost: RenderHost;
  readonly renderPool: RenderPool;
  readonly serverLink: ServerLink;
  readonly startedAt: number;
  readonly startLoginShell: () => Promise<string[]>;
  readonly state: () => BootState;
  readonly studioWindows: () => BrowserWindow[];
  readonly userDataFile: (...parts: string[]) => string;
}

interface StateCell {
  readonly get: () => BootState;
  readonly set: (next: BootState) => void;
}

interface BootShell {
  readonly native: NativeShell;
  readonly serverLink: ServerLink;
}

const MS_PER_SECOND = 1000;

const INITIAL_STATE: BootState = {
  earlyLoginPath: null,
  isServerStopped: false,
  isServerStopping: false,
  isWindowsAllowed: false,
  prepared: null,
  session: null,
  updater: null,
};

const toUserDataFile = (...parts: string[]): string =>
  path.join(app.getPath("userData"), ...parts);

const listStudioWindows = (): BrowserWindow[] =>
  BrowserWindow.getAllWindows().filter(
    (window) => !isRenderContents(window.webContents)
  );

const toLayout = (ownDir: string): AppLayout => {
  if (app.isPackaged) {
    return packagedLayout(ownDir, process.resourcesPath);
  }

  return devLayout(ownDir);
};

const toReadySession = (
  session: ServerSession | null,
  server: ServerHandle
): ServerSession | null => {
  if (session?.server !== server) {
    return session;
  }

  return { ...session, isReady: true };
};

const createTransitions = (cell: StateCell): BootTransitions => {
  const update = (patch: Partial<BootState>): void => {
    cell.set({ ...cell.get(), ...patch });
  };

  return {
    allowWindows: () => update({ isWindowsAllowed: true }),
    isLiveSession: (server) =>
      cell.get().session?.server === server &&
      cell.get().session?.isReady === true,
    markServerStopped: () => update({ isServerStopped: true }),
    markServerStopping: () => update({ isServerStopping: true }),
    markSessionReady: (server) =>
      update({ session: toReadySession(cell.get().session, server) }),
    setPrepared: (prepared) => update({ prepared }),
    setSession: (session) => update({ session }),
    setUpdater: (updater) => update({ updater }),
  };
};

const getLoginShellDirs = async (
  markBoot: (name: string) => void
): Promise<string[]> => {
  const dirs = await loginShellPath(process.env);

  markBoot("loginShell");

  return dirs;
};

const createMarker = (
  startedAt: number,
  marks: Record<string, number>
): ((name: string) => void) => {
  const markBoot = (name: string): void => {
    marks[name] ??= Date.now() - startedAt;
    console.log(`[desktop] boot ${name} ${marks[name]}ms`);
  };

  return markBoot;
};

const createShell = (
  cell: StateCell,
  hooks: BootHooks,
  bootOf: () => Boot
): BootShell => {
  const serverLink = new ServerLink(
    (finished) => void native.runFinished(finished),
    (notice) => native.mcpApproval(notice)
  );

  const native: NativeShell = new NativeShell({
    checkSetup: () => hooks.checkSetup(bootOf()),
    focusWindow: () => hooks.focusWindow(bootOf()),
    link: serverLink,
    pushDeviceToken: (token) => void serverLink.pushCloudSession(token),
    recentsFile: () => toUserDataFile("recent-projects.json"),
    studioOrigin: () => cell.get().session?.url ?? null,
    studioWindows: listStudioWindows,
    updater: () => cell.get().updater,
    windowsAllowed: () => cell.get().isWindowsAllowed,
  });

  return { native, serverLink };
};

const createBoot = (ownDir: string, hooks: BootHooks): Boot => {
  const startedAt = Date.now() - Math.round(process.uptime() * MS_PER_SECOND);
  const marks: Record<string, number> = {};
  let current = INITIAL_STATE;

  const cell: StateCell = {
    get: () => current,
    set: (next) => {
      current = next;
    },
  };

  const markBoot = createMarker(startedAt, marks);

  const startLoginShell = (): Promise<string[]> => {
    const early = cell.get().earlyLoginPath ?? getLoginShellDirs(markBoot);

    cell.set({ ...cell.get(), earlyLoginPath: early });

    return early;
  };

  const renderPool = new RenderPool(() =>
    [cell.get().session?.url ?? ""].filter(Boolean)
  );

  const { native, serverLink } = createShell(cell, hooks, () => boot);

  const boot: Boot = {
    ...createTransitions(cell),
    createUpdater: () =>
      new Updater({
        activeRuns: () => serverLink.activeRuns().length,
        logFile: toUserDataFile("logs", "updater.log"),
        resourcesPath: process.resourcesPath,
      }),
    layout: toLayout(ownDir),
    logFile: () => toUserDataFile("logs", "server.log"),
    markBoot,
    marks,
    native,
    ownDir,
    renderHost: new RenderHost(renderPool),
    renderPool,
    serverLink,
    startLoginShell,
    startedAt,
    state: cell.get,
    studioWindows: listStudioWindows,
    userDataFile: toUserDataFile,
  };

  return boot;
};

export { createBoot };

export type { Boot, BootHooks, BootState, Prepared, ServerSession };
