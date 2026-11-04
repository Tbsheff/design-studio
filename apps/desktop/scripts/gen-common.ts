import type { Dirent } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { format } from "oxfmt";
import type { FormatOptions } from "oxfmt";

import { WORKSPACE_ROOT } from "./workspace-root.ts";

interface GeneratedFile {
  path: string;
  text: string;
}

const ROOT = WORKSPACE_ROOT;
const ACTIONS = path.join(ROOT, "packages/common/actions/src");
const HANDLERS = path.join(ROOT, "apps/desktop/src/server/handlers");
const HEADER = "// @generated";
const CORE = "_core";
const CLOSE_CONST = "} as const;";

const pascal = (ctx: string): string =>
  ctx
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

const camel = (ctx: string): string => {
  const name = pascal(ctx);

  return name.charAt(0).toLowerCase() + name.slice(1);
};

const FORMAT_CONFIG = path.join(ROOT, "oxfmt.config.ts");

const formatFile = async (file: GeneratedFile): Promise<GeneratedFile> => {
  const config: { default: FormatOptions } = await import(
    pathToFileURL(FORMAT_CONFIG).href
  );

  const result = await format(file.path, file.text, config.default);

  return { path: file.path, text: result.code };
};

const actionConst = (ctx: string, tail: string): string =>
  `${camel(tail)}${pascal(ctx)}`;

const lines = (...body: string[]): string =>
  `${[HEADER, ...body].join("\n")}\n`;

const stub = (name: string): string =>
  lines(`const ${name} = {} as const;`, "", `export { ${name} };`);

const readOrEmpty = async (file: string): Promise<string> => {
  try {
    return await readFile(file, "utf-8");
  } catch {
    return "";
  }
};

const listDir = async (dir: string): Promise<Dirent[]> => {
  try {
    return await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
};

const actionTails = async (
  dir: string,
  skip: ReadonlySet<string>
): Promise<string[]> => {
  const entries = await listDir(dir);

  const tails: string[] = [];

  for (const entry of entries) {
    const tail = entry.name.replace(/\.ts$/u, "");

    const isAction =
      entry.isFile() &&
      entry.name.endsWith(".ts") &&
      !entry.name.endsWith(".test.ts") &&
      !skip.has(tail);

    if (isAction) {
      tails.push(tail);
    }
  }

  return tails.toSorted((left, right) => left.localeCompare(right));
};

export {
  ACTIONS,
  CLOSE_CONST,
  CORE,
  HANDLERS,
  ROOT,
  actionConst,
  actionTails,
  camel,
  formatFile,
  lines,
  pascal,
  readOrEmpty,
  stub,
};

export type { GeneratedFile };
