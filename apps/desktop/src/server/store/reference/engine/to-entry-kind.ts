import {
  MAX_DOCUMENT_BYTES,
  MAX_IMAGE_BYTES,
  MAX_TEXT_BYTES,
} from "./reference-limits.js";

type EntryKind = "document" | "image" | "skip" | "text";

const SKIPPED_DIRECTORIES: ReadonlySet<string> = new Set([
  "__MACOSX",
  "bower_components",
  "build",
  "dist",
  "node_modules",
  "target",
  "vendor",
]);

const TEXT_EXTENSIONS: ReadonlySet<string> = new Set([
  "css",
  "csv",
  "html",
  "js",
  "json",
  "jsx",
  "md",
  "mdx",
  "scss",
  "svg",
  "toml",
  "ts",
  "tsv",
  "tsx",
  "txt",
  "xml",
  "yaml",
  "yml",
]);

const IMAGE_EXTENSIONS: ReadonlySet<string> = new Set([
  "avif",
  "gif",
  "jpeg",
  "jpg",
  "png",
  "webp",
]);

const DOCUMENT_EXTENSIONS: ReadonlySet<string> = new Set(["pdf"]);

const toExtension = (fileName: string): string => {
  const dot = fileName.lastIndexOf(".");

  if (dot <= 0) {
    return "";
  }

  return fileName.slice(dot + 1).toLowerCase();
};

const isSkippedDirectory = (name: string): boolean =>
  name.startsWith(".") || SKIPPED_DIRECTORIES.has(name);

const isSkippedPath = (relativePath: string): boolean => {
  const parts = relativePath.split("/");
  const directories = parts.slice(0, -1);
  const fileName = parts.at(-1) ?? "";

  return (
    fileName.startsWith(".") ||
    directories.some((directory) => isSkippedDirectory(directory))
  );
};

const toKindOfExtension = (extension: string): EntryKind => {
  if (TEXT_EXTENSIONS.has(extension)) {
    return "text";
  }

  if (IMAGE_EXTENSIONS.has(extension)) {
    return "image";
  }

  if (DOCUMENT_EXTENSIONS.has(extension)) {
    return "document";
  }

  return "skip";
};

const toEntryKind = (relativePath: string): EntryKind => {
  if (isSkippedPath(relativePath)) {
    return "skip";
  }

  return toKindOfExtension(toExtension(relativePath));
};

const toLimitOfKind = (kind: EntryKind): number => {
  if (kind === "text") {
    return MAX_TEXT_BYTES;
  }

  if (kind === "image") {
    return MAX_IMAGE_BYTES;
  }

  if (kind === "document") {
    return MAX_DOCUMENT_BYTES;
  }

  return 0;
};

const isWithinKindLimit = (kind: EntryKind, bytes: number): boolean =>
  bytes <= toLimitOfKind(kind);

export { isSkippedDirectory, isWithinKindLimit, toEntryKind, toExtension };

export type { EntryKind };
