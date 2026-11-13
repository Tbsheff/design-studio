import { readFile } from "node:fs/promises";
import path from "node:path";

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

const TAG_START = "<";

const OPEN_TAGS = ["head", "html"];

const toRootCache = (): BoundedCache<string, Promise<string>> =>
  createBoundedCache<string, Promise<string>>(ROOTS_MAX);

const isHiddenPath = (relative: string): boolean =>
  relative.split("/").some((segment) => segment.startsWith("."));

const toTagEnd = (lower: string, open: string): number => {
  const start = lower.indexOf(`${TAG_START}${open}`);

  if (start === -1) {
    return -1;
  }

  const end = lower.indexOf(">", start);

  if (end === -1) {
    return -1;
  }

  return end + 1;
};

const toBridgeOffset = (source: string): number => {
  const lower = source.toLowerCase();

  for (const open of OPEN_TAGS) {
    const end = toTagEnd(lower, open);

    if (end !== -1) {
      return end;
    }
  }

  return Math.max(0, toTagEnd(lower, "!doctype"));
};

const toBridgedHtml = (source: string): string => {
  const offset = toBridgeOffset(source);

  return `${source.slice(0, offset)}${BRIDGE_SCRIPT_TAG}${source.slice(offset)}`;
};

const toServedHtml = async (
  root: string,
  relative: string,
  file: string
): Promise<ServedFile> => {
  const source = await readFile(file, "utf-8");
  const html = await injectForPreview(root, relative, toBridgedHtml(source));

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
