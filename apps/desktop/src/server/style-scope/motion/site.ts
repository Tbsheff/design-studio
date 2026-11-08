import { readFile } from "node:fs/promises";
import path from "node:path";

import { isMarker } from "./classes.js";
import { findMarker } from "./css.js";
import { elementClassInfo, resolveSource } from "./deps.js";
import type { MotionMode, Project, SourceLoc } from "./deps.js";

interface MotionScope {
  project: Project;
  workTree: string;
}

interface MotionSite {
  classes: string[];
  file: string;
  html: boolean;
  marker: string | null;
  mode: MotionMode;
  original: string;
  relative: string;
}

class MotionError extends Error {
  public override name = "MotionError";
}

const HTML_EXT = new Set([".html", ".htm"]);

const toLineAt = (text: string, line: number): string =>
  text.split("\n")[line - 1] ?? "";

const toMarkerOf = (
  classes: readonly string[],
  original: string,
  loc: SourceLoc
): string | null =>
  classes.find((token) => isMarker(token)) ??
  findMarker(toLineAt(original, loc.line));

const toModeOf = (mode: string | undefined): MotionMode => {
  if (mode === "classes") {
    return "classes";
  }

  return "css";
};

const toLoadSite = async (
  scope: MotionScope,
  loc: SourceLoc
): Promise<MotionSite> => {
  const resolved = await resolveSource(scope.workTree, loc.file);

  const [text, info] = await Promise.all([
    readFile(resolved.file, "utf-8"),
    elementClassInfo(scope.workTree, scope.project.kind, loc),
  ]);

  const found = info.tailwind?.classes ?? [];

  return {
    classes: found,
    file: resolved.file,
    html: HTML_EXT.has(path.extname(resolved.relative).toLowerCase()),
    marker: toMarkerOf(found, text, loc),
    mode: toModeOf(info.tailwind?.mode),
    original: text,
    relative: resolved.relative,
  };
};

export { toLoadSite as loadSite, MotionError };

export type { MotionScope, MotionSite };
