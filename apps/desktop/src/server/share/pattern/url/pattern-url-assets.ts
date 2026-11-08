import { readFile } from "node:fs/promises";
import path from "node:path";

import { collectAssets, copyAssets } from "../../page-import/index.js";
import type { Capture } from "../../page-import/index.js";
import { loadConfig } from "../deps.js";

const ASSET_FOLDER = "pattern-assets";

const ASSET_BYTES_MAX = 200_000;

const INLINE_BYTES_MAX = 1_200_000;

const MIME = new Map([
  ["avif", "image/avif"],
  ["gif", "image/gif"],
  ["jpeg", "image/jpeg"],
  ["jpg", "image/jpeg"],
  ["otf", "font/otf"],
  ["png", "image/png"],
  ["svg", "image/svg+xml"],
  ["ttf", "font/ttf"],
  ["webp", "image/webp"],
  ["woff", "font/woff"],
  ["woff2", "font/woff2"],
]);

interface PatternAssets {
  readonly files: readonly string[];
  readonly local: ReadonlyMap<string, string>;
  readonly skipped: readonly string[];
}

interface AssetRequest {
  readonly allowLoopback: boolean;
  readonly capture: Capture;
  readonly deadline: number;
}

const toMimeOf = (relative: string): string | null =>
  MIME.get(path.extname(relative).slice(1).toLowerCase()) ?? null;

const toReadFile = async (file: string): Promise<Buffer | null> => {
  try {
    return await readFile(file);
  } catch {
    return null;
  }
};

const toDataUri = async (
  root: string,
  relative: string
): Promise<string | null> => {
  const mime = toMimeOf(relative);
  const bytes = await toReadFile(path.join(root, ...relative.split("/")));

  if (mime === null || bytes === null || bytes.length > ASSET_BYTES_MAX) {
    return null;
  }

  return `data:${mime};base64,${bytes.toString("base64")}`;
};

const toInlineAll = async (
  root: string,
  written: ReadonlyMap<string, string>
): Promise<{ local: Map<string, string>; skipped: string[] }> => {
  const local = new Map<string, string>();
  const skipped: string[] = [];
  let used = 0;

  const loaded = await Promise.all(
    [...written].map(async ([url, relative]) => ({
      uri: await toDataUri(root, relative),
      url,
    }))
  );

  for (const { uri, url } of loaded) {
    if (uri === null || used + uri.length > INLINE_BYTES_MAX) {
      skipped.push(url);
    } else {
      used += uri.length;
      local.set(url, uri);
    }
  }

  return { local, skipped };
};

const toPatternAssets = async (
  request: AssetRequest,
  root: Capture["page"]["root"]
): Promise<PatternAssets> => {
  if (root === null) {
    return { files: [], local: new Map(), skipped: [] };
  }

  const folder = path.join(loadConfig().dataDir, ASSET_FOLDER);

  const copied = await copyAssets(
    collectAssets(root, request.capture.page.fontFaces),
    {
      allowLoopback: request.allowLoopback,
      deadline: request.deadline,
      folder: "assets",
      kept: request.capture.kept,
      workTree: folder,
    }
  );

  const inlined = await toInlineAll(folder, copied.local);

  return {
    files: copied.written.map((relative) => path.basename(relative)),
    local: inlined.local,
    skipped: [...copied.skipped, ...inlined.skipped],
  };
};

export { toPatternAssets };

export type { AssetRequest, PatternAssets };
