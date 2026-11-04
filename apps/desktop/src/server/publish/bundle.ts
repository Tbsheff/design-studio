import {
  copyFile,
  lstat,
  mkdir,
  readdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import {
  BRIDGE_SCRIPT_PATH,
  BRIDGE_TOKEN_PARAM,
  SOURCE_LOC_ATTR,
} from "@design-studio/contracts";

import {
  PUBLISH_MAX_BYTES,
  PUBLISH_MAX_FILE_BYTES,
  PUBLISH_MAX_FILES,
} from "../../shared/publish.js";
import { injectForPreview } from "../design-system/html-link.js";

export interface BundleResult {
  pages: string[];
  files: string[];
  bytes: number;
  skipped: number;
}

export class BundleError extends Error {}

const ALLOWED_EXT = new Set([
  ".html",
  ".htm",
  ".css",
  ".js",
  ".mjs",
  ".json",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".avif",
  ".svg",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".mp4",
  ".webm",
  ".mp3",
  ".wav",
  ".txt",
  ".webmanifest",
]);

const SKIP_DIRS = new Set([
  "node_modules",
  "studio",
  "snapshots",
  "coverage",
  "handoff",
]);

const SKIP_FILES =
  /^(package(-lock)?\.json|tsconfig.*\.json|jsconfig.*\.json|components\.json|bun\.lockb?|yarn\.lock|pnpm-lock\.yaml|vite\.config\..*|robots\.txt)$/i;

const SECRET_FILE = /(^\.env)|\.(pem|key|p12|pfx|crt|map)$/i;
const MAX_DEPTH = 12;

export function isPublishable(relative: string): boolean {
  const parts = relative.split("/");

  if (parts.some((part) => part.startsWith(".") || part === "")) {
    return false;
  }

  if (parts.slice(0, -1).some((dir) => SKIP_DIRS.has(dir))) {
    return false;
  }

  const name = parts[parts.length - 1] ?? "";

  if (SECRET_FILE.test(name) || SKIP_FILES.test(name)) {
    return false;
  }

  if (
    parts[0] === "design-system" &&
    !/\.(css|woff2?|ttf|otf|svg|png|jpe?g|webp)$/i.test(name)
  ) {
    return false;
  }

  return ALLOWED_EXT.has(path.posix.extname(name).toLowerCase());
}

async function walk(
  root: string,
  dir: string,
  depth: number,
  out: string[]
): Promise<number> {
  if (depth > MAX_DEPTH) {
    return 0;
  }

  let skipped = 0;
  const entries = await readdir(path.join(root, dir), { withFileTypes: true });

  for (const entry of entries) {
    const relative = dir ? `${dir}/${entry.name}` : entry.name;
    const info = await lstat(path.join(root, relative));

    if (info.isSymbolicLink()) {
      skipped += 1;
    } else if (info.isDirectory()) {
      skipped +=
        entry.name.startsWith(".") || SKIP_DIRS.has(entry.name)
          ? 1
          : await walk(root, relative, depth + 1, out);
    } else if (info.isFile() && isPublishable(relative)) {
      out.push(relative);
    } else {
      skipped += 1;
    }
  }

  return skipped;
}

export function cleanHtml(html: string): string {
  const bridge = BRIDGE_SCRIPT_PATH.replaceAll(
    /[.*+?^${}()|[\]\\/]/g,
    String.raw`\$&`
  );

  return html
    .replaceAll(
      new RegExp(`<script\\b[^>]*${bridge}[^>]*>\\s*</script>`, "gi"),
      ""
    )
    .replaceAll(new RegExp(`\\s${SOURCE_LOC_ATTR}="[^"]*"`, "g"), "")
    .replaceAll(new RegExp(`[?&]${BRIDGE_TOKEN_PARAM}=[^"'&\\s]*`, "g"), "");
}

function assertClean(relative: string, text: string, secrets: string[]): void {
  for (const secret of secrets) {
    if (secret.length >= 8 && text.includes(secret)) {
      throw new BundleError(
        `${relative} holds a Design Studio key, so it was not published.`
      );
    }
  }
}

async function copyOne(
  root: string,
  outDir: string,
  relative: string,
  secrets: string[]
): Promise<number> {
  const from = path.join(root, relative);
  const to = path.join(outDir, relative);
  await mkdir(path.dirname(to), { recursive: true });
  const ext = path.posix.extname(relative).toLowerCase();

  if (ext === ".html" || ext === ".htm") {
    const html = cleanHtml(
      await injectForPreview(root, relative, await readFile(from, "utf-8"))
    );

    assertClean(relative, html, secrets);
    await writeFile(to, html);

    return Buffer.byteLength(html);
  }

  if ([".css", ".js", ".mjs", ".json", ".svg", ".txt"].includes(ext)) {
    assertClean(relative, await readFile(from, "utf-8"), secrets);
  }

  await copyFile(from, to);

  return (await lstat(to)).size;
}

export async function buildSiteBundle(
  root: string,
  outDir: string,
  secrets: string[]
): Promise<BundleResult> {
  const files: string[] = [];
  const skipped = await walk(root, "", 0, files);
  files.sort();
  const pages = files.filter((f) => /\.html?$/i.test(f));

  if (pages.length === 0) {
    throw new BundleError("This version has no HTML page to publish.");
  }

  if (files.length > PUBLISH_MAX_FILES) {
    throw new BundleError(
      `This version has ${files.length} files. Publish takes at most ${PUBLISH_MAX_FILES}.`
    );
  }

  let bytes = 0;

  for (const relative of files) {
    const size = (await lstat(path.join(root, relative))).size;

    if (size > PUBLISH_MAX_FILE_BYTES) {
      throw new BundleError(
        `${relative} is larger than 25 MB, the Cloudflare limit for one file.`
      );
    }

    bytes += await copyOne(root, outDir, relative, secrets);

    if (bytes > PUBLISH_MAX_BYTES) {
      throw new BundleError(
        "This version is larger than 100 MB, so it was not published."
      );
    }
  }

  return { pages, files, bytes, skipped };
}

const ROOT_REF =
  /\s(?:src|href|action|poster)\s*=\s*["']\/(?!\/)[^"']*["']|url\(\s*["']?\/(?!\/)/i;

export async function rootRefPages(
  outDir: string,
  files: string[]
): Promise<string[]> {
  const hits: string[] = [];

  for (const relative of files.filter((f) => /\.(html?|css)$/i.test(f))) {
    if (ROOT_REF.test(await readFile(path.join(outDir, relative), "utf-8"))) {
      hits.push(relative);
    }
  }

  return hits;
}
