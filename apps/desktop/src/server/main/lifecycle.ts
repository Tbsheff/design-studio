import { mkdir } from "node:fs/promises";
import path from "node:path";

import type { serve } from "@hono/node-server";

import type { FlushableEventBus } from "../events/index.js";
import type { ServerConfig } from "../platform/config/index.js";
import { acquireDataLock } from "../platform/data-lock/index.js";
import { logError, logInfo } from "../platform/logger/index.js";
import type { createPreviewService } from "../preview/index.js";
import { updateStaleRuns } from "../run-log/index.js";
import { watchParent } from "./parent-watch.js";
import { disposeRuntime } from "./runtime.js";
import type { StudioRuntime } from "./runtime.js";

const FORCE_EXIT_MS = 5000;

type Preview = ReturnType<typeof createPreviewService>;

interface SignalHandle {
  runtime: StudioRuntime;
  shutdown: (signal: string) => void;
}

const prepareDataDir = async (config: ServerConfig): Promise<void> => {
  await mkdir(path.join(config.dataDir, "projects"), { recursive: true });
  const releaseLock = acquireDataLock(config.dataDir, config.studioPort);

  process.on("exit", releaseLock);
};

const stopStaleRuns = async (config: ServerConfig): Promise<void> => {
  try {
    const count = await updateStaleRuns(path.join(config.dataDir, "projects"));

    if (count > 0) {
      logInfo(`[studio] marked ${count} unfinished runs as failed`);
    }
  } catch (error) {
    logError("[studio] cannot mark unfinished runs", error, config.dataDir);
  }
};

interface ShutdownParts {
  baseBus: FlushableEventBus;
  preview: Preview;
  runtime: StudioRuntime;
}

const stopAll = async (parts: ShutdownParts): Promise<void> => {
  const results = await Promise.allSettled([
    parts.baseBus.flush(),
    parts.preview.stop(),
    disposeRuntime(parts.runtime),
  ]);

  for (const result of results) {
    if (result.status === "rejected") {
      logError("[studio] shutdown step failed", result.reason);
    }
  }

  process.exit(0);
};

const handleSignals = (
  server: ReturnType<typeof serve>,
  parts: ShutdownParts
): SignalHandle => {
  let stopping = false;

  const shutdown = (signal: string): void => {
    if (stopping) {
      return;
    }

    stopping = true;
    logInfo(`[studio] ${signal} received, shutting down`);
    const forceExit = setTimeout(() => process.exit(1), FORCE_EXIT_MS);

    forceExit.unref();
    server.close();
    void stopAll(parts);
  };

  watchParent(() => shutdown("parent exit"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGHUP", () => shutdown("SIGHUP"));

  return { runtime: parts.runtime, shutdown };
};

export { handleSignals, prepareDataDir, stopStaleRuns };

export type { ShutdownParts, SignalHandle };
