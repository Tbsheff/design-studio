import { readFile, realpath } from "node:fs/promises";
import path from "node:path";

import { SOURCE_LOC_ATTR } from "../../shared/contracts.js";
import { cleanExportPath } from "../../shared/export.js";
import { BadRequestError, NotFoundError } from "../platform/errors/index.js";
import { withPagePath } from "../project-source/index.js";
import { attemptNull, toOptional } from "./attempt-null.js";
import { waitForPage } from "./capture.js";
import { NO_RENDER, resolveFrameSource, toPagePath } from "./frame-source.js";
import type { FrameDeps, FrameHtml, FrameHtmlQuery } from "./frame-source.js";

const SKIP = new Set([
  "node_modules",
  ".git",
  ".studio",
  "dist",
  ".vite",
  ".next",
  ".turbo",
  ".DS_Store",
]);

const MAX_TEXT = 262_144;

const VIEWPORT = { height: 900, width: 1440 };

const RENDERED_DOM = `(() => { const doc = document.documentElement.cloneNode(true); for (const node of doc.querySelectorAll('script, link[rel="modulepreload"], style[id^="studio-"]')) node.remove(); for (const node of doc.querySelectorAll('[${SOURCE_LOC_ATTR}]')) node.removeAttribute('${SOURCE_LOC_ATTR}'); return '<!doctype html>\\n' + doc.outerHTML; })()`;

const insideRoot = async (root: string, relative: string): Promise<string> => {
  const cleaned = cleanExportPath(relative);

  if (!cleaned) {
    throw new BadRequestError("path is not valid");
  }

  if (cleaned.split("/").some((part) => SKIP.has(part))) {
    throw new BadRequestError("that file is not part of the source");
  }

  const realRoot = await realpath(root);

  const full = await attemptNull(() =>
    realpath(path.join(realRoot, ...cleaned.split("/")))
  );

  if (!full || !full.startsWith(realRoot + path.sep)) {
    throw new NotFoundError("file not found");
  }

  return full;
};

const cut = (value: string): string => {
  if (value.length <= MAX_TEXT) {
    return value;
  }

  return `${value.slice(0, MAX_TEXT)}\n[cut at ${MAX_TEXT} characters]`;
};

const renderDom = (
  deps: FrameDeps,
  url: string,
  page: string | null
): Promise<string> => {
  const { preview } = deps;

  if (!preview?.withPage) {
    return Promise.reject(new BadRequestError(NO_RENDER));
  }

  return preview.withPage(
    withPagePath(url, toOptional(page)),
    VIEWPORT,
    async (target) => {
      await waitForPage(target);

      return target.evaluate<string>(RENDERED_DOM);
    }
  );
};

const readFrameHtml = async (
  deps: FrameDeps,
  query: FrameHtmlQuery
): Promise<FrameHtml> => {
  const src = await resolveFrameSource(deps, query, false);
  const page = toPagePath(query.path);

  if (src.project.kind === "html") {
    const file = await insideRoot(
      await src.files(),
      page ?? (src.project.entry || "index.html")
    );

    return { html: cut(await readFile(file, "utf-8")) };
  }

  const opened = await src.open();

  try {
    return { html: cut(await renderDom(deps, opened.url, page)) };
  } finally {
    await attemptNull(() => opened.release());
  }
};

export { readFrameHtml };
