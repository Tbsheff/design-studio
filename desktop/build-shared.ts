import path from "node:path";

import { build } from "esbuild";
import type { BuildOptions, BuildResult } from "esbuild";

const BRIDGE_ENTRY = path.resolve(
  import.meta.dirname,
  "..",
  "src",
  "bridge",
  "bridge.ts"
);

interface BuildBridgeOptions {
  readonly logLevel: "silent" | "warning";
  readonly outfile: string | null;
}

const buildBridge = (options: BuildBridgeOptions): Promise<BuildResult> => {
  const output: BuildOptions = { write: false };

  if (options.outfile !== null) {
    output.write = true;
    output.outfile = options.outfile;
  }

  return build({
    bundle: true,
    entryPoints: [BRIDGE_ENTRY],
    format: "iife",
    logLevel: options.logLevel,
    minify: true,
    platform: "browser",
    target: ["es2020"],
    ...output,
  });
};

export { BRIDGE_ENTRY, buildBridge };

export type { BuildBridgeOptions };
