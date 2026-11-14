import path from "node:path";

import type { BuildOptions, BuildResult } from "esbuild";

const BRIDGE_ENTRY = path.resolve(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "bridge",
  "bridge.ts"
);

interface BuildBridgeOptions {
  readonly logLevel: "silent" | "warning";
  readonly outfile: string | null;
}

const toOutput = (outfile: string | null): BuildOptions => {
  if (outfile === null) {
    return { write: false };
  }

  return { outfile, write: true };
};

const buildBridge = async (
  options: BuildBridgeOptions
): Promise<BuildResult> => {
  const { build } = await import("esbuild");

  return build({
    bundle: true,
    entryPoints: [BRIDGE_ENTRY],
    format: "iife",
    logLevel: options.logLevel,
    minify: true,
    platform: "browser",
    target: ["es2020"],
    ...toOutput(options.outfile),
  });
};

const bundleBridgeText = async (): Promise<string | null> => {
  const result = await buildBridge({ logLevel: "silent", outfile: null });
  const [output] = result.outputFiles ?? [];

  return output?.text ?? null;
};

export { BRIDGE_ENTRY, buildBridge, bundleBridgeText };

export type { BuildBridgeOptions };
