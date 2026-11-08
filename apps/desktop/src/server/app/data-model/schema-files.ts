import type { Dirent } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import type { SchemaSource } from "./engine/index.js";

interface FileStat {
  readonly isDirectory: boolean;
  readonly key: string;
}

const SKIPPED = new Set([
  ".git",
  ".next",
  ".studio",
  ".turbo",
  "build",
  "dist",
  "migrations",
  "node_modules",
  "out",
]);

const SEARCH_DEPTH = 6;

const PRISMA_EXTENSION = ".prisma";

const QUOTED_PART = /["'`](?<part>[^"'`]+)["'`]/gu;

const CONFIG_SCHEMA = /schema:\s*(?<value>[^\n]+)/u;

const PACKAGE_SCHEMA =
  /"prisma"\s*:\s*\{[^}]*"schema"\s*:\s*"(?<value>[^"]+)"/u;

const toStat = async (file: string): Promise<FileStat | null> => {
  try {
    const found = await stat(file);

    return {
      isDirectory: found.isDirectory(),
      key: `${file}:${String(found.mtimeMs)}:${String(found.size)}`,
    };
  } catch {
    return null;
  }
};

const toText = async (file: string): Promise<string | null> => {
  try {
    return await readFile(file, "utf-8");
  } catch {
    return null;
  }
};

const toEntryName = (entry: Dirent): string[] => {
  if (SKIPPED.has(entry.name)) {
    return [];
  }

  if (entry.isDirectory()) {
    return [`${entry.name}/`];
  }

  return [entry.name];
};

const toEntries = async (folder: string): Promise<readonly string[]> => {
  try {
    const entries = await readdir(folder, { withFileTypes: true });

    return entries.flatMap((entry) => toEntryName(entry)).toSorted();
  } catch {
    return [];
  }
};

const toPrismaFiles = async (folder: string): Promise<readonly string[]> => {
  const entries = await toEntries(folder);

  const nested = await Promise.all(
    entries.map(async (entry): Promise<readonly string[]> => {
      if (entry.endsWith("/")) {
        return await toPrismaFiles(path.join(folder, entry));
      }

      if (entry.endsWith(PRISMA_EXTENSION)) {
        return [path.join(folder, entry)];
      }

      return [];
    })
  );

  return nested.flat();
};

const toConfigSchema = async (appRoot: string): Promise<string | null> => {
  const text = await toText(path.join(appRoot, "prisma.config.ts"));
  const value = CONFIG_SCHEMA.exec(text ?? "")?.groups?.["value"] ?? "";

  const parts = [...value.matchAll(QUOTED_PART)].map(
    (found) => found.groups?.["part"] ?? ""
  );

  if (parts.length === 0) {
    return null;
  }

  return path.join(appRoot, ...parts);
};

const toPackageSchema = async (appRoot: string): Promise<string | null> => {
  const text = await toText(path.join(appRoot, "package.json"));
  const value = PACKAGE_SCHEMA.exec(text ?? "")?.groups?.["value"] ?? "";

  if (value === "") {
    return null;
  }

  return path.join(appRoot, value);
};

const toFoundSchema = async (
  folder: string,
  depth: number
): Promise<string | null> => {
  const direct = path.join(folder, "prisma", "schema.prisma");

  if ((await toStat(direct)) !== null) {
    return direct;
  }

  if (depth >= SEARCH_DEPTH) {
    return null;
  }

  const entries = await toEntries(folder);

  const found = await Promise.all(
    entries.flatMap((entry) => {
      if (entry.endsWith("/")) {
        return [toFoundSchema(path.join(folder, entry), depth + 1)];
      }

      return [];
    })
  );

  return found.find((file) => file !== null) ?? null;
};

const toSchemaPath = async (appRoot: string): Promise<string | null> => {
  const configured =
    (await toConfigSchema(appRoot)) ?? (await toPackageSchema(appRoot));

  if (configured !== null && (await toStat(configured)) !== null) {
    return configured;
  }

  return await toFoundSchema(appRoot, 0);
};

const toSchemaPaths = async (
  schemaPath: string
): Promise<readonly string[]> => {
  const found = await toStat(schemaPath);

  if (found === null) {
    return [];
  }

  if (found.isDirectory) {
    return await toPrismaFiles(schemaPath);
  }

  const sibling = await toPrismaFiles(
    path.join(path.dirname(schemaPath), "schema")
  );

  return [schemaPath, ...sibling];
};

const toSchemaSources = async (
  appRoot: string
): Promise<readonly SchemaSource[] | null> => {
  const schemaPath = await toSchemaPath(appRoot);

  if (schemaPath === null) {
    return null;
  }

  const paths = await toSchemaPaths(schemaPath);

  const sources = await Promise.all(
    paths.map(async (file) => ({
      file: path.relative(appRoot, file).split(path.sep).join("/"),
      text: (await toText(file)) ?? "",
    }))
  );

  return sources.filter((source) => source.text !== "");
};

const toSchemaKey = async (appRoot: string): Promise<string | null> => {
  const schemaPath = await toSchemaPath(appRoot);

  if (schemaPath === null) {
    return null;
  }

  const paths = await toSchemaPaths(schemaPath);
  const stats = await Promise.all(paths.map((file) => toStat(file)));
  const keys = stats.map((found) => found?.key ?? "");

  return `${appRoot}|${keys.join("|")}`;
};

export { toSchemaKey, toSchemaSources };
