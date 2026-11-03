import { readFile } from "node:fs/promises";

import { packagedResource } from "../resources.js";

let bundlePromise: Promise<string> | null = null;

async function bundleBridge(): Promise<string> {
  const { buildBridge } = await import("../../../desktop/build-shared.js");

  const result = await buildBridge({ outfile: null, logLevel: "silent" });

  const output = result.outputFiles[0];

  if (!output) {
    throw new Error("esbuild produced no output for bridge.ts");
  }

  return output.text;
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
