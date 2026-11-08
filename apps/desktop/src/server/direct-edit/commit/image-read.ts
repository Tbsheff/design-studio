import { readFile, realpath } from "node:fs/promises";
import path from "node:path";

import type { Project } from "@design-studio/contracts";
import { parse } from "parse5";

import { DirectEditError } from "../engine/errors.js";
import type { SourcePosition } from "../engine/errors.js";
import { findElementAt } from "../engine/html.js";
import { resolveSource } from "./edit-source.js";
import { jsxElementAt } from "./image-attrs.js";
import { sniffImage } from "./image-source.js";
import type { ImageBytes } from "./image-source.js";

interface LayerImageTarget {
  readonly background: boolean;
  readonly source: {
    readonly col: number;
    readonly file: string;
    readonly line: number;
  } | null;
  readonly tag: string;
}

const NO_IMAGE = "This layer has no image file to edit. Select an image layer.";

const SRC_PATTERN = /\bsrc=\{?\s*["'`](?<url>[^"'`]+)["'`]/u;

const URL_PATTERN = /url\((?<url>[^)]+)\)/u;

const toNoImage = (): DirectEditError =>
  new DirectEditError("element_not_found", NO_IMAGE);

const getOpeningTag = async (
  file: string,
  relative: string,
  position: SourcePosition
): Promise<string> => {
  const text = await readFile(file, "utf-8");

  if (/\.html?$/iu.test(relative)) {
    const element = findElementAt(
      parse(text, { sourceCodeLocationInfo: true }),
      position
    );

    const start = element?.sourceCodeLocation?.startTag;

    if (!start) {
      throw toNoImage();
    }

    return text.slice(start.startOffset, start.endOffset);
  }

  const typescript = path.extname(relative).toLowerCase() === ".tsx";
  const opening = jsxElementAt(text, position, typescript).openingElement;

  return text.slice(opening.start ?? 0, opening.end ?? 0);
};

const toUrl = (tag: string, target: LayerImageTarget): string | null => {
  if (target.background) {
    return (
      URL_PATTERN.exec(tag)?.groups?.url?.replaceAll(/["'\s]/gu, "") ?? null
    );
  }

  return SRC_PATTERN.exec(tag)?.groups?.url ?? null;
};

const toHomes = (project: Project, page: string, url: string): string[] => {
  if (!url.startsWith("/")) {
    return [path.posix.join(path.posix.dirname(page), url)];
  }

  const name = url.slice(1);
  const homes = [path.posix.join("public", name), name];

  if (project.app) {
    const appDir = project.app.appDir.replaceAll("\\", "/");

    homes.unshift(path.posix.join(appDir, "public", name));
  }

  return homes;
};

const getOneImage = async (
  root: string,
  relative: string
): Promise<ImageBytes | null> => {
  const file = path.join(root, ...relative.split("/"));

  if (!file.startsWith(root + path.sep)) {
    return null;
  }

  try {
    const bytes = await readFile(file);
    const ext = sniffImage(bytes);

    if (ext === null) {
      return null;
    }

    const stem = path.posix.basename(relative).replace(/\.[^.]+$/u, "");

    return { bytes, ext, stem };
  } catch {
    return null;
  }
};

const getFirstImage = async (
  workTree: string,
  candidates: readonly string[]
): Promise<ImageBytes | null> => {
  const root = await realpath(workTree);

  const found = await Promise.all(
    candidates.map((relative) => getOneImage(root, relative))
  );

  return found.find((image) => image !== null) ?? null;
};

const getLayerImage = async (
  project: Project,
  workTree: string,
  target: LayerImageTarget
): Promise<ImageBytes> => {
  const { source } = target;

  if (source === null) {
    throw toNoImage();
  }

  const resolved = await resolveSource(workTree, source.file);
  const tag = await getOpeningTag(resolved.file, resolved.relative, source);
  const url = toUrl(tag, target);

  if (url === null || url.startsWith("data:") || /^https?:/iu.test(url)) {
    throw toNoImage();
  }

  const clean = url.split(/[?#]/u)[0] ?? url;

  const image = await getFirstImage(
    workTree,
    toHomes(project, resolved.relative, clean)
  );

  if (image === null) {
    throw toNoImage();
  }

  return image;
};

export { getLayerImage };

export type { LayerImageTarget };
