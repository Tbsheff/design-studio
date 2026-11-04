import type { ShareServerState } from "../../shared/share.js";
import type { ShareListener as ShareServer } from "./listener.js";
import { createLiveHub } from "./live.js";
import type { LiveHub, LiveRefresher as LiveRefreshLoop } from "./live.js";
import type { ShareLinkDeps, ShareParts } from "./share-links.js";
import { createShareStore } from "./store.js";
import type { ShareStore as ShareFiles } from "./store.js";

interface ShareCore {
  readonly files: ShareFiles;
  readonly hub: LiveHub;
}

interface ShareRuntime {
  readonly deps: ShareLinkDeps;
  readonly refresher: LiveRefreshLoop;
  readonly server: ShareServer;
}

const OFF_STATE: ShareServerState = {
  lan: false,
  lanUrl: null,
  localUrl: null,
  running: false,
};

const cores = new Map<string, ShareCore>();

const runtimes = new Map<string, ShareRuntime>();

const toShareCore = (dataDir: string): ShareCore => {
  const found = cores.get(dataDir);

  if (found) {
    return found;
  }

  const core: ShareCore = {
    files: createShareStore(dataDir),
    hub: createLiveHub(),
  };

  cores.set(dataDir, core);

  return core;
};

const bindShareRuntime = (dataDir: string, runtime: ShareRuntime): void => {
  runtimes.set(dataDir, runtime);
};

const toShareRuntime = (dataDir: string): ShareRuntime | null =>
  runtimes.get(dataDir) ?? null;

const toShareParts = (dataDir: string): ShareParts | null => {
  const runtime = toShareRuntime(dataDir);

  if (runtime === null) {
    return null;
  }

  const core = toShareCore(dataDir);

  return {
    deps: runtime.deps,
    files: core.files,
    hub: core.hub,
    kick: () => runtime.refresher.kick(),
    server: runtime.server,
  };
};

const toServerState = (dataDir: string): ShareServerState => {
  const runtime = toShareRuntime(dataDir);

  if (runtime === null) {
    return OFF_STATE;
  }

  return runtime.server.state();
};

export {
  bindShareRuntime,
  OFF_STATE,
  toServerState,
  toShareCore,
  toShareParts,
  toShareRuntime,
};

export type { ShareCore, ShareRuntime };
