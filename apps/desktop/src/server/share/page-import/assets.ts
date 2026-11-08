import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { CapturedFace, CapturedNode } from "./captured.js";
import {
  PAGE_IMPORT_ASSET_BYTES_MAX,
  PAGE_IMPORT_ASSETS_MAX,
  PAGE_IMPORT_TOTAL_BYTES_MAX,
  safeFetch,
  sniffImage,
} from "./deps.js";
import { elementChildren } from "./nodes.js";

const URL_IN_CSS = /url\("(?<href>https?:[^"]+)"\)/gu;

const FONT_EXT = /\.(?<ext>woff2|woff|ttf|otf)(?:[?#]|$)/iu;

const TRACKERS =
  /(?:google-analytics\.com|googletagmanager\.com|doubleclick\.net|facebook\.com\/tr|connect\.facebook\.net|bat\.bing\.com|hotjar\.com|segment\.io|segment\.com|mixpanel\.com|clarity\.ms|pixel\.)/iu;

const ASSET_MS = 10_000;

const HASH_CHARS = 12;

const URL_TEXT_MAX = 200;

interface AssetSet {
  readonly images: Set<string>;
  readonly fonts: Set<string>;
}

interface AssetFiles {
  readonly local: ReadonlyMap<string, string>;
  readonly written: readonly string[];
  readonly skipped: readonly string[];
}

interface AssetJob {
  readonly workTree: string;
  readonly folder: string;
  readonly allowLoopback: boolean;
  readonly deadline: number;
  readonly kept: ReadonlyMap<string, Buffer>;
}

interface AssetItem {
  readonly url: string;
  readonly isFont: boolean;
}

interface LoadedAsset {
  readonly item: AssetItem;
  readonly bytes: Buffer | null;
}

interface ReadyAsset {
  readonly url: string;
  readonly bytes: Buffer;
  readonly ext: string;
}

const isTrackerUrl = (url: string): boolean => TRACKERS.test(url);

const toCssUrls = (value: string): string[] =>
  [...value.matchAll(URL_IN_CSS)].flatMap((match) => {
    const href = match.groups?.["href"];

    if (href) {
      return [href];
    }

    return [];
  });

const toCollectNode = (node: CapturedNode, set: AssetSet): void => {
  for (const [name, value] of node.attrs) {
    if (name === "src" && node.tag === "img" && !isTrackerUrl(value)) {
      set.images.add(value);
    }
  }

  for (const value of Object.values(node.style ?? {})) {
    for (const href of toCssUrls(value)) {
      set.images.add(href);
    }
  }

  for (const child of elementChildren(node)) {
    toCollectNode(child, set);
  }
};

const toCollectAssets = (
  root: CapturedNode,
  faces: readonly CapturedFace[]
): AssetSet => {
  const set: AssetSet = { fonts: new Set(), images: new Set() };

  toCollectNode(root, set);

  for (const face of faces) {
    for (const href of toCssUrls(face.css)) {
      set.fonts.add(href);
    }
  }

  return set;
};

const toFontExt = (url: string): string | null =>
  FONT_EXT.exec(url)?.groups?.["ext"]?.toLowerCase() ?? null;

const toImageExt = (bytes: Buffer): string | null => {
  try {
    return sniffImage(bytes);
  } catch {
    return null;
  }
};

const toFetchBytes = async (
  url: string,
  job: AssetJob
): Promise<Buffer | null> => {
  try {
    const fetched = await safeFetch(url, {
      allowLoopback: job.allowLoopback,
      deadline: job.deadline,
      maxBytes: PAGE_IMPORT_ASSET_BYTES_MAX,
      maxRedirects: 3,
      timeoutMs: ASSET_MS,
    });

    return fetched.body;
  } catch {
    return null;
  }
};

const toLoadAsset = async (
  item: AssetItem,
  job: AssetJob
): Promise<LoadedAsset> => {
  const kept = job.kept.get(item.url);

  if (kept) {
    return { bytes: kept, item };
  }

  return { bytes: await toFetchBytes(item.url, job), item };
};

const toExtOf = (item: AssetItem, bytes: Buffer): string | null => {
  if (bytes.length > PAGE_IMPORT_ASSET_BYTES_MAX) {
    return null;
  }

  if (item.isFont) {
    return toFontExt(item.url);
  }

  return toImageExt(bytes);
};

const toWriteAsset = async (
  job: AssetJob,
  asset: ReadyAsset
): Promise<string> => {
  const hash = createHash("sha256")
    .update(asset.bytes)
    .digest("hex")
    .slice(0, HASH_CHARS);

  const relative = `${job.folder}/${hash}.${asset.ext}`;
  const file = path.join(job.workTree, ...relative.split("/"));

  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, asset.bytes);

  return relative;
};

const toPickReady = (
  loaded: readonly LoadedAsset[],
  skipped: string[]
): ReadyAsset[] => {
  const ready: ReadyAsset[] = [];
  let total = 0;

  for (const { item, bytes } of loaded) {
    const ext = bytes && toExtOf(item, bytes);

    if (!bytes || !ext || total + bytes.length > PAGE_IMPORT_TOTAL_BYTES_MAX) {
      skipped.push(item.url.slice(0, URL_TEXT_MAX));
    } else {
      total += bytes.length;
      ready.push({ bytes, ext, url: item.url });
    }
  }

  return ready;
};

const toCopyAssets = async (
  set: AssetSet,
  job: AssetJob
): Promise<AssetFiles> => {
  const queue: AssetItem[] = [
    ...[...set.fonts].map((url) => ({ isFont: true, url })),
    ...[...set.images].map((url) => ({ isFont: false, url })),
  ];

  const skipped = queue
    .slice(PAGE_IMPORT_ASSETS_MAX)
    .map((item) => item.url.slice(0, URL_TEXT_MAX));

  const loaded = await Promise.all(
    queue.slice(0, PAGE_IMPORT_ASSETS_MAX).map((item) => toLoadAsset(item, job))
  );

  const ready = toPickReady(loaded, skipped);

  const paths = await Promise.all(
    ready.map((asset) => toWriteAsset(job, asset))
  );

  const local = new Map(
    ready.map((asset, index) => [asset.url, paths[index] ?? ""])
  );

  return { local, skipped, written: [...new Set(paths)] };
};

export {
  toCollectAssets as collectAssets,
  toCopyAssets as copyAssets,
  toCssUrls as cssUrls,
  isTrackerUrl,
};

export type { AssetFiles, AssetJob, AssetSet };
