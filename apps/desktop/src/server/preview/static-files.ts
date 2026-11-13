import { realpath, stat } from "node:fs/promises";
import path from "node:path";

interface ServedPath {
  readonly file: string;
  readonly relative: string;
}

const HTML_TYPE = "text/html; charset=utf-8";

const SCRIPT_TYPE = "text/javascript; charset=utf-8";

const JSON_TYPE = "application/json; charset=utf-8";

const TEXT_TYPE = "text/plain; charset=utf-8";

const INDEX_FILE = "index.html";

const CONTENT_TYPES = new Map([
  [".avif", "image/avif"],
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".htm", HTML_TYPE],
  [".html", HTML_TYPE],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", SCRIPT_TYPE],
  [".json", JSON_TYPE],
  [".map", JSON_TYPE],
  [".md", TEXT_TYPE],
  [".mjs", SCRIPT_TYPE],
  [".mp3", "audio/mpeg"],
  [".mp4", "video/mp4"],
  [".otf", "font/otf"],
  [".pdf", "application/pdf"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".ttf", "font/ttf"],
  [".txt", TEXT_TYPE],
  [".wav", "audio/wav"],
  [".webm", "video/webm"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

const BAD_SEGMENTS = new Set([".", ".."]);

const toContentType = (extension: string): string | null =>
  CONTENT_TYPES.get(extension) ?? null;

const isInside = (root: string, target: string): boolean => {
  const relative = path.relative(root, target);

  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
};

const toDecodedSegment = (segment: string): string | null => {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
};

const isBadSegment = (decoded: string): boolean =>
  BAD_SEGMENTS.has(decoded) || /[/\\\0]/u.test(decoded);

const toRelativePath = (rawPath: string): string | null => {
  const segments: string[] = [];

  for (const segment of rawPath.split("/").filter(Boolean)) {
    const decoded = toDecodedSegment(segment);

    if (decoded === null || isBadSegment(decoded)) {
      return null;
    }

    segments.push(decoded);
  }

  return segments.join("/");
};

const toRealInside = async (
  rootReal: string,
  candidate: string
): Promise<string | null> => {
  const real = await realpath(candidate);

  if (!isInside(rootReal, real)) {
    return null;
  }

  return real;
};

const toIndexRelative = (relative: string): string => {
  if (relative === "") {
    return INDEX_FILE;
  }

  return `${relative}/${INDEX_FILE}`;
};

const toFileInside = async (
  rootReal: string,
  candidate: string,
  relative: string
): Promise<ServedPath | null> => {
  const real = await toRealInside(rootReal, candidate);

  if (real === null) {
    return null;
  }

  const info = await stat(real);

  if (info.isFile()) {
    return { file: real, relative };
  }

  if (!info.isDirectory()) {
    return null;
  }

  const index = await toRealInside(rootReal, path.join(candidate, INDEX_FILE));

  if (index === null) {
    return null;
  }

  const indexInfo = await stat(index);

  if (!indexInfo.isFile()) {
    return null;
  }

  return { file: index, relative: toIndexRelative(relative) };
};

const toServedPath = async (
  root: string,
  relative: string
): Promise<ServedPath | null> => {
  try {
    const rootReal = await realpath(root);
    const candidate = path.resolve(rootReal, relative);

    if (!isInside(rootReal, candidate)) {
      return null;
    }

    return await toFileInside(rootReal, candidate, relative);
  } catch {
    return null;
  }
};

export { toContentType, toRelativePath, toServedPath };

export type { ServedPath };
