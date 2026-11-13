import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { env } from "node:process";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { fail } from "../stamp/args.js";
import { toWorkspaceBin } from "../workspace-root.ts";
import { isFile } from "./steps.ts";

interface ClipServer {
  readonly child: ChildProcess;
  readonly log: string;
  readonly origin: string;
  readonly work: string;
}

const APP_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const STUDIO_PORT = 47_310;
const PREVIEW_PORT = 47_311;
const SHARE_PORT = 47_312;
const VITE_PORT_BASE = 47_400;
const APP_PORT_BASE = 47_500;
const BOOT_TIMEOUT_MS = 120_000;
const BOOT_POLL_MS = 500;
const STOP_WAIT_MS = 800;
const UI_SECRET_BYTES = 32;
const UI_SECRET = randomBytes(UI_SECRET_BYTES).toString("hex");

const toUiIndex = (): string => path.join(APP_ROOT, "dist", "ui", "index.html");

const runViteBuild = async (): Promise<void> => {
  const vite = await import("vite");

  await vite.build({
    configFile: path.join(APP_ROOT, "vite.ui.config.ts"),
    logLevel: "error",
  });

  if (!(await isFile(toUiIndex()))) {
    fail(
      `build:ui wrote no ${toUiIndex()}`,
      "pnpm --config.verify-deps-before-run=false run build:ui"
    );
  }
};

const isServerUp = async (origin: string): Promise<boolean> => {
  try {
    const response = await fetch(`${origin}/`);

    return response.ok;
  } catch {
    return false;
  }
};

const runUntilServerUp = async (
  origin: string,
  deadline: number,
  log: string
): Promise<void> => {
  if (await isServerUp(origin)) {
    return;
  }

  if (Date.now() > deadline) {
    fail(
      `the studio server did not answer on ${origin}`,
      `read ${log}, then run STUDIO_AGENT=mock STUDIO_DATA_DIR=$(mktemp -d) pnpm run server`
    );
  }

  await sleep(BOOT_POLL_MS);
  await runUntilServerUp(origin, deadline, log);
};

const startServer = async (): Promise<ClipServer> => {
  const work = await mkdtemp(path.join(os.tmpdir(), "studio-clip-"));
  const log = path.join(work, "server.log");
  const origin = `http://127.0.0.1:${STUDIO_PORT}`;
  const stream = createWriteStream(log);

  const child = spawn(toWorkspaceBin("tsx"), ["src/server/index.ts"], {
    cwd: APP_ROOT,
    detached: true,
    env: {
      ...env,
      STUDIO_AGENT: "mock",
      STUDIO_APP_PORT_BASE: String(APP_PORT_BASE),
      STUDIO_DATA_DIR: path.join(work, "data"),
      STUDIO_PORT: String(STUDIO_PORT),
      STUDIO_PREVIEW_PORT: String(PREVIEW_PORT),
      STUDIO_PROJECTS_DIR: path.join(work, "projects"),
      STUDIO_SHARE_PORT: String(SHARE_PORT),
      STUDIO_UI_SECRET: UI_SECRET,
      STUDIO_VITE_PORT_BASE: String(VITE_PORT_BASE),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout?.pipe(stream);
  child.stderr?.pipe(stream);
  await runUntilServerUp(origin, Date.now() + BOOT_TIMEOUT_MS, log);

  return { child, log, origin, work };
};

const stopServer = async (server: ClipServer): Promise<void> => {
  const pid = server.child.pid ?? null;

  if (pid !== null) {
    try {
      process.kill(-pid, "SIGTERM");
    } catch {
      server.child.kill("SIGTERM");
    }
  }

  await sleep(STOP_WAIT_MS);
  await rm(server.work, { force: true, recursive: true });
};

const startStudio = async (shouldSkipBuild: boolean): Promise<ClipServer> => {
  if (!shouldSkipBuild || !(await isFile(toUiIndex()))) {
    await runViteBuild();
  }

  return startServer();
};

export { APP_ROOT, UI_SECRET, startStudio, stopServer };

export type { ClipServer };
