import { readFile } from "node:fs/promises";

import { packagedResource } from "../platform/resources/index.js";

let bundlePromise: Promise<string> | null = null;

async function bundleBridge(): Promise<string> {
  const { bundleBridgeText } =
    await import("../platform/bridge-build/index.js");

  const text = await bundleBridgeText();

  if (text === null) {
    throw new Error("esbuild produced no output for bridge.ts");
  }

  return text;
}

const PREBUILT_BRIDGE_FILE = "bridge.js";

function prebuiltOrBundle(): Promise<string> {
  const prebuilt = packagedResource(PREBUILT_BRIDGE_FILE);

  return prebuilt ? readFile(prebuilt, "utf-8") : bundleBridge();
}

export function loadBridgeScript(): Promise<string> {
  if (!bundlePromise) {
    bundlePromise = prebuiltOrBundle().catch((error: unknown) => {
      bundlePromise = null;
      throw error;
    });
  }

  return bundlePromise;
}
