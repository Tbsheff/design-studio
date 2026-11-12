import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { argv, env, execPath } from "node:process";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { fail, runCli } from "./stamp/args.js";
import { toStudioToken } from "./studio-session.js";

const APP_ROOT = fileURLToPath(new URL("../", import.meta.url));

const HEAVY_PACKAGES = [
  "playwright-core",
  "playwright",
  "@playwright/test",
  "typescript",
  "typescript-api",
  "vite",
  "esbuild",
  "@anthropic-ai/claude-agent-sdk",
  "@anthropic-ai/sdk",
  "nspell",
  "dictionary-en",
  "sharp",
  "rollup",
  "@babel/core",
  "postcss",
  "lightningcss",
  "jsdom",
];

const WATCH_PACKAGES = ["@babel/parser", "parse5", "chokidar", "culori", "zod"];

const HOME_PATHS = [
  "/",
  "/api/projects",
  "/api/activity",
  "/api/mcp",
  "/api/packs",
];

const STUDIO_PORT = 4393;
const PREVIEW_PORT = 4394;
const VITE_PORT_BASE = 31_000;
const DEFAULT_SETTLE_MS = 10_000;
const BOOT_TIMEOUT_MS = 120_000;
const BOOT_POLL_MS = 250;
const SIGNAL_WAIT_MS = 500;

const RECORDER_SOURCE = [
  'import { registerHooks } from "node:module";',
  'import { writeFileSync } from "node:fs";',
  "const seen = new Set();",
  String.raw`registerHooks({ resolve(specifier, context, next) { const result = next(specifier, context); seen.add(result.url + "\t" + (context.parentURL ?? "")); return result; } });`,
  String.raw`const dump = () => writeFileSync(process.env.STUDIO_BOOT_RECORD, [...seen].join("\n"));`,
  'process.on("SIGUSR2", dump);',
].join("\n");

const toRecorderUrl = (): string =>
  `data:text/javascript,${encodeURIComponent(RECORDER_SOURCE)}`;

const toSettleMs = (): number => {
  const flag = argv.find((arg) => arg.startsWith("--settle=")) ?? null;

  if (flag === null) {
    return DEFAULT_SETTLE_MS;
  }

  return Number(flag.slice("--settle=".length));
};

const isServerUp = async (origin: string): Promise<boolean> => {
  try {
    await fetch(`${origin}/api/projects`);

    return true;
  } catch {
    return false;
  }
};

const runUntilServerUp = async (
  origin: string,
  deadline: number
): Promise<void> => {
  if (await isServerUp(origin)) {
    return;
  }

  if (Date.now() > deadline) {
    fail(
      `server did not start at ${origin}`,
      "pnpm run server, and read the boot error"
    );
  }

  await sleep(BOOT_POLL_MS);

  return runUntilServerUp(origin, deadline);
};

const toSessionToken = async (
  origin: string,
  dataDir: string
): Promise<string> => {
  try {
    return await toStudioToken(origin, dataDir);
  } catch (error) {
    return fail(
      `GET /api/session failed: ${String(error)}`,
      "check src/server/http/app-session-routes.ts"
    );
  }
};

const runHomeRead = async (
  origin: string,
  route: string,
  token: string
): Promise<void> => {
  const response = await fetch(`${origin}${route}`, {
    headers: { "x-studio-token": token },
  });

  if (response.ok) {
    await response.arrayBuffer();

    return;
  }

  fail(
    `GET ${route} failed with ${response.status}`,
    "pnpm run server, then open the route"
  );
};

const runHomeVisit = async (origin: string, dataDir: string): Promise<void> => {
  const token = await toSessionToken(origin, dataDir);

  await Promise.all(
    HOME_PATHS.map((route) => runHomeRead(origin, route, token))
  );
};

const toPackageName = (url: string): string | null => {
  const marker = "/node_modules/";
  const index = url.lastIndexOf(marker);

  if (index === -1) {
    return null;
  }

  const parts = url.slice(index + marker.length).split("/");

  if (parts[0]?.startsWith("@")) {
    return `${parts[0]}/${parts[1] ?? ""}`;
  }

  return parts[0] ?? null;
};

const toImporter = (parent: string): string | null => {
  if (!parent.startsWith("file:") || toPackageName(parent) !== null) {
    return null;
  }

  return path.relative(APP_ROOT, fileURLToPath(parent));
};

const toLoadedPackages = (record: string): Map<string, Set<string>> => {
  const importers = new Map<string, Set<string>>();

  for (const line of record.split("\n")) {
    const [url = "", parent = ""] = line.split("\t");
    const name = toPackageName(url);

    if (name !== null) {
      const names = importers.get(name) ?? new Set<string>();
      const importer = toImporter(parent);

      if (importer !== null) {
        names.add(importer);
      }

      importers.set(name, names);
    }
  }

  return importers;
};

const runBoot = async (): Promise<string> => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "studio-boot-"));
  const recordFile = path.join(dataDir, "boot-record.txt");
  const origin = `http://127.0.0.1:${STUDIO_PORT}`;

  const child = spawn(
    execPath,
    ["--import", "tsx", "--import", toRecorderUrl(), "src/server/index.ts"],
    {
      cwd: APP_ROOT,
      env: {
        ...env,
        STUDIO_AGENT: "mock",
        STUDIO_BOOT_RECORD: recordFile,
        STUDIO_DATA_DIR: dataDir,
        STUDIO_PORT: String(STUDIO_PORT),
        STUDIO_PREVIEW_PORT: String(PREVIEW_PORT),
        STUDIO_VITE_PORT_BASE: String(VITE_PORT_BASE),
      },
      stdio: ["ignore", "ignore", "inherit"],
    }
  );

  try {
    await runUntilServerUp(origin, Date.now() + BOOT_TIMEOUT_MS);
    await runHomeVisit(origin, dataDir);
    await sleep(toSettleMs());
    child.kill("SIGUSR2");
    await sleep(SIGNAL_WAIT_MS);

    return await readFile(recordFile, "utf-8");
  } finally {
    child.kill("SIGTERM");
    await sleep(SIGNAL_WAIT_MS);
    await rm(dataDir, { force: true, recursive: true });
  }
};

const runCheck = async (): Promise<void> => {
  const loaded = toLoadedPackages(await runBoot());
  const heavy = HEAVY_PACKAGES.filter((name) => loaded.has(name));
  const watched = WATCH_PACKAGES.filter((name) => loaded.has(name));

  if (argv.includes("--list")) {
    for (const [name, importers] of loaded) {
      console.log(`${name} <- ${[...importers].join(", ")}`);
    }
  }

  console.log(`boot to Home loaded ${loaded.size} packages`);

  if (watched.length > 0) {
    console.log(`info: also loaded at boot: ${watched.join(", ")}`);
  }

  if (heavy.length > 0) {
    fail(
      `heavy modules loaded at boot: ${heavy.join(", ")}`,
      "load each one with a dynamic import on first use (AGENTS.md P9), then run pnpm exec tsx scripts/check-boot-imports.ts --list"
    );
  }

  console.log("no heavy module loads at boot");
};

await runCli(runCheck);
