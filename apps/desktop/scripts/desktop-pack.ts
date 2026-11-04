import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { stagePackage } from "../desktop/build.js";
import { toBuilderArgs, toPackOptions } from "../desktop/pack-args.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main(): Promise<void> {
  const options = toPackOptions(process.env);
  await stagePackage();

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    CSC_IDENTITY_AUTO_DISCOVERY: "false",
  };

  delete env.ELECTRON_RUN_AS_NODE;
  console.log(
    `[desktop] electron-builder: identity ${options.identity === "-" ? "ad-hoc" : options.identity}, update feed ${options.updateUrl ?? "none"}, notarize ${env.STUDIO_NOTARY_PROFILE ? `profile ${env.STUDIO_NOTARY_PROFILE}` : "off"}`
  );

  const result = spawnSync(
    path.join(ROOT, "node_modules", ".bin", "electron-builder"),
    toBuilderArgs(options),
    { cwd: ROOT, env, stdio: "inherit" }
  );

  process.exit(result.status ?? 1);
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
