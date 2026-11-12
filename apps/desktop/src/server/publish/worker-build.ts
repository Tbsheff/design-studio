import { existsSync } from "node:fs";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { WORKER_NAME } from "@design-studio/actions/publish-remote";

export const PUBLISH_BUCKET = WORKER_NAME;
export const PUBLISH_DATABASE = WORKER_NAME;
const COMPATIBILITY_DATE = "2026-07-01";

export interface WorkerSource {
  dir: string;
  entry: string | null;
  prebuilt: string | null;
  migrations: string;
  localRunner: string | null;
}

function candidates(): string[] {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const fromEnv = process.env.STUDIO_PUBLISH_WORKER_DIR;

  return [
    fromEnv,
    path.resolve(here, "..", "..", "..", "..", "publish"),
    path.join(here, "publish-worker"),
  ].filter((d): d is string => Boolean(d));
}

export function findWorkerSource(): WorkerSource | null {
  for (const dir of candidates()) {
    const migrations = path.join(dir, "migrations");

    if (!existsSync(migrations)) {
      continue;
    }

    const entry = path.join(dir, "src", "index.ts");
    const prebuilt = path.join(dir, "worker.js");
    const runner = path.join(dir, "scripts", "local.mjs");

    const hasRunner =
      existsSync(runner) &&
      existsSync(path.join(dir, "node_modules", "miniflare"));

    return {
      dir,
      entry: existsSync(entry) ? entry : null,
      prebuilt: existsSync(prebuilt) ? prebuilt : null,
      migrations,
      localRunner: hasRunner ? runner : null,
    };
  }

  return null;
}

export interface BuildOutputOptions {
  databaseId: string;
}

export async function writeBuildOutput(
  source: WorkerSource,
  stage: string,
  options: BuildOutputOptions
): Promise<string> {
  const root = path.join(stage, ".cloudflare", "output", "v0");
  const worker = path.join(root, "workers", "default");
  const bundle = path.join(worker, "bundle", "worker.js");
  await mkdir(path.dirname(bundle), { recursive: true });

  if (source.entry) {
    const { build } = await import("esbuild");

    await build({
      entryPoints: [source.entry],
      outfile: bundle,
      bundle: true,
      format: "esm",
      platform: "neutral",
      target: "es2023",
      legalComments: "none",
      logLevel: "silent",
    });
  } else if (source.prebuilt) {
    await copyFile(source.prebuilt, bundle);
  } else {
    throw new Error(
      "The publish Worker bundle is missing from this copy of Design Studio."
    );
  }

  await writeFile(
    path.join(root, "config.json"),
    JSON.stringify({ buildContext: { isPreview: false } })
  );

  const config = {
    name: WORKER_NAME,
    compatibilityDate: COMPATIBILITY_DATE,
    workersDev: true,
    previewUrls: false,
    env: {
      DB: { type: "d1", id: options.databaseId },
      FILES: { type: "r2", name: PUBLISH_BUCKET },
      PUBLISH_KEY_HASH: { type: "secret" },
    },
    manifest: {
      type: "complete",
      mainModule: "worker.js",
      modules: { "worker.js": { type: "esm" } },
    },
  };

  await writeFile(
    path.join(worker, "worker.config.json"),
    JSON.stringify(config, null, 2)
  );

  return bundle;
}
