import type { SourceLoc } from "@design-studio/contracts";

const PATH_TAIL = 2;

const toLocText = (source: SourceLoc): string =>
  `${source.file}:${source.line}:${source.col}`;

const toShortPath = (file: string): string => {
  const parts = file.split("/");

  if (parts.length > PATH_TAIL) {
    return parts.slice(-PATH_TAIL).join("/");
  }

  return file;
};

export { toLocText, toShortPath };
