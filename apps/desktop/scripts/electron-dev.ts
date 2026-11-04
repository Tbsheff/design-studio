import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildDesktopApp, ensureUi } from "../desktop/build.js";
import { toWorkspaceBin } from "./workspace-root.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DESKTOP_OUT = path.join(ROOT, "desktop", "dist");

function electronEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;

  return env;
}

function runElectron(): void {
  const electron = toWorkspaceBin("electron");

  const child = spawn(electron, ["."], {
    cwd: ROOT,
    env: electronEnv(),
    stdio: "inherit",
  });

  const forward = (signal: NodeJS.Signals) => () => child.kill(signal);
  process.on("SIGINT", forward("SIGINT"));
  process.on("SIGTERM", forward("SIGTERM"));
  child.on("exit", (code) => process.exit(code ?? 0));
}

async function main(): Promise<void> {
  const buildOnly = process.argv.includes("--build-only");

  if (!buildOnly) {
    ensureUi();
  }

  await buildDesktopApp(DESKTOP_OUT);

  if (!buildOnly) {
    runElectron();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
