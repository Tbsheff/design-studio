import { mkdir, realpath, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import type { DirectEditRequest } from "@design-studio/contracts";

import type { EditScope, ResolvedSource } from "../../events/index.js";
import { writeAtomic as platformWriteAtomic } from "../../platform/atomic-write/index.js";
import { isNodeError } from "../../platform/errors/index.js";
import { DirectEditError } from "../engine/errors.js";
import type { PatchResult } from "../engine/errors.js";
import { patchHtml } from "../engine/html.js";
import { patchJsx } from "../engine/jsx.js";
import { tailwindThemeFor } from "../tailwind/theme.js";
import type { TailwindTheme } from "../tailwind/theme.js";

const EDITABLE_EXTENSIONS = new Set([".html", ".htm", ".jsx", ".tsx"]);

const BLOCKED_SEGMENTS = new Set([
  "node_modules",
  ".git",
  "dist",
  ".vite",
  ".studio",
]);

function invalidSource(message: string): DirectEditError {
  return new DirectEditError("invalid_source", message);
}

function assertEditablePath(file: string): void {
  if (file.includes("\0")) {
    throw invalidSource("The source path is not valid");
  }

  if (!EDITABLE_EXTENSIONS.has(path.extname(file).toLowerCase())) {
    throw invalidSource(
      "Only .html, .htm, .jsx and .tsx files can be edited directly"
    );
  }
}

async function realOrMissing(candidate: string): Promise<string> {
  try {
    return await realpath(candidate);
  } catch (error) {
    if (
      isNodeError(error) &&
      (error.code === "ENOENT" || error.code === "ENOTDIR")
    ) {
      throw new DirectEditError(
        "source_not_found",
        "The source file does not exist"
      );
    }

    throw error;
  }
}

function isInside(root: string, target: string): boolean {
  return target.startsWith(root + path.sep);
}

export async function resolveSource(
  workTree: string,
  file: string
): Promise<ResolvedSource> {
  assertEditablePath(file);
  const root = await realpath(workTree);
  const candidate = path.resolve(root, file);

  if (!isInside(root, candidate)) {
    throw invalidSource("The source file is outside the direction");
  }

  const real = await realOrMissing(candidate);

  if (!isInside(root, real)) {
    throw invalidSource("The source file is outside the direction");
  }

  const segments = path.relative(root, real).split(path.sep);

  if (segments.some((segment) => BLOCKED_SEGMENTS.has(segment.toLowerCase()))) {
    throw invalidSource("The source file is in a folder that cannot be edited");
  }

  assertEditablePath(real);

  if (!(await stat(real)).isFile()) {
    throw invalidSource("The source path is not a file");
  }

  return { file: real, relative: segments.join("/") };
}

export function patchSource(
  relative: string,
  source: string,
  request: DirectEditRequest,
  tailwind: TailwindTheme | null = null
): PatchResult {
  const extension = path.extname(relative).toLowerCase();

  const edit = {
    style: request.style ?? {},
    text: request.text,
    tag: request.tag,
    name: request.name,
    move: request.move,
    insert: request.insert,
    classes: request.classes,
    component: request.component,
    variant: request.variant,
  };

  const position = { line: request.source.line, col: request.source.col };

  if (extension === ".html" || extension === ".htm") {
    if (request.component !== undefined) {
      throw new DirectEditError(
        "invalid_request",
        "Component uses can be edited in .jsx and .tsx files only"
      );
    }

    return patchHtml(source, position, edit, tailwind);
  }

  return patchJsx(source, position, edit, {
    typescript: extension === ".tsx",
    tailwind,
    file: relative,
  });
}

export async function themeForFile(
  workTree: string,
  relative: string,
  text: string,
  scope: EditScope | undefined
): Promise<TailwindTheme | null> {
  if (!scope) {
    return null;
  }

  return tailwindThemeFor(workTree, { relative, text }, scope);
}

export async function writeAtomic(
  file: string,
  content: string
): Promise<void> {
  await platformWriteAtomic(file, content, {
    cleanup: "rename",
    hiddenTemp: true,
    keepMode: true,
  });
}

export async function writeNewFile(
  file: string,
  content: string
): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content, { flag: "wx" });
}
