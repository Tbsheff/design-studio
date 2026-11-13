import { readFile } from "node:fs/promises";
import path from "node:path";

import { toBridgedHtml } from "@design-studio/actions/publish-remote";

import { injectForPreview } from "../design-system/index.js";
import { createBoundedCache } from "../platform/cache/index.js";
import type { BoundedCache } from "../platform/cache/index.js";
import {
  BRIDGE_SCRIPT_TAG,
  toContentType,
  toRelativePath,
  toServedPath,
} from "../preview/frame-files/index.js";

interface ServedFile {
  readonly body: Uint8Array<ArrayBuffer>;
  readonly contentType: string;
}

const ROOTS_MAX = 32;

const HTML_EXTENSIONS = new Set([".htm", ".html"]);

const toRootCache = (): BoundedCache<string, Promise<string>> =>
  createBoundedCache<string, Promise<string>>(ROOTS_MAX);

const isHiddenPath = (relative: string): boolean =>
  relative.split("/").some((segment) => segment.startsWith("."));

const toServedHtml = async (
  root: string,
  relative: string,
  file: string
): Promise<ServedFile> => {
  const source = await readFile(file, "utf-8");

  const html = await injectForPreview(
    root,
    relative,
    toBridgedHtml(source, BRIDGE_SCRIPT_TAG)
  );

  return {
    body: new TextEncoder().encode(html),
    contentType: toContentType(".html") ?? "text/html",
  };
};

const toServedFile = async (
  root: string,
  rawPath: string
): Promise<ServedFile | null> => {
  const relative = toRelativePath(rawPath);

  if (relative === null || isHiddenPath(relative)) {
    return null;
  }

  const resolved = await toServedPath(root, relative || "index.html");

  if (!resolved) {
    return null;
  }

  const extension = path.extname(resolved.file).toLowerCase();
  const contentType = toContentType(extension);

  if (contentType === null) {
    return null;
  }

  if (HTML_EXTENSIONS.has(extension)) {
    return await toServedHtml(root, resolved.relative, resolved.file);
  }

  return { body: new Uint8Array(await readFile(resolved.file)), contentType };
};

export { toRootCache, toServedFile };

export type { ServedFile };
