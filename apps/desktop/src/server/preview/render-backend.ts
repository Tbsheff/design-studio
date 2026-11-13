import {
  RENDER_BACKEND_ENV,
  RENDER_IPC_ENV,
  RENDER_SOCKET_ENV,
} from "../../shared/render-rpc.js";
import type { RenderBackendName } from "../../shared/render-rpc.js";
import type { RenderBackend } from "../../shared/server-ports.js";
import { toOwnerFile } from "../platform/chrome-owner/index.js";
import type { BrowserPool } from "./browser.js";
import type { Stamps } from "./capture-cache.js";

export { NAVIGATION_TIMEOUT_MS, SETTLE_TIMEOUT_MS } from "./render-contract.js";

export function chooseBackend(
  env: NodeJS.ProcessEnv = process.env
): RenderBackendName {
  const forced = env[RENDER_BACKEND_ENV];

  if (forced === "playwright" || forced === "electron") {
    return forced;
  }

  if (forced) {
    throw new Error(
      `${RENDER_BACKEND_ENV} must be "playwright" or "electron", got "${forced}"`
    );
  }

  return env[RENDER_IPC_ENV] === "1" || env[RENDER_SOCKET_ENV]
    ? "electron"
    : "playwright";
}

export async function createRenderBackend(
  ownerFile: string | null = null,
  env: NodeJS.ProcessEnv = process.env
): Promise<RenderBackend> {
  if (chooseBackend(env) === "electron") {
    const { createElectronBackend } = await import("./render-electron.js");

    return createElectronBackend(env);
  }

  const { createPlaywrightBackend } = await import("./render-playwright.js");

  return createPlaywrightBackend(ownerFile);
}

export const createBrowserPool = async (
  previewOrigin: string,
  dataDir: string,
  stamps: Stamps
): Promise<BrowserPool> => {
  const { BrowserPool: Pool } = await import("./browser.js");
  const ownerFile = toOwnerFile(dataDir);

  return new Pool(previewOrigin, () => createRenderBackend(ownerFile), stamps);
};
