import path from "node:path";

import { createServer } from "../../src/server/main/public.js";

async function main(): Promise<void> {
  const uiDir = process.env.PERF_UI_DIR;

  if (!uiDir) {
    throw new Error("PERF_UI_DIR is required");
  }

  await createServer({ uiDir: path.resolve(uiDir) });
  console.log("perf server ready");
}

main().catch((error: unknown) => {
  console.error("[perf server] failed", error);
  process.exit(1);
});
