import { readFile } from "node:fs/promises";
import path from "node:path";

import type { SourceLoc } from "@design-studio/contracts";
import { Effect } from "effect";

import {
  elementClassInfo,
  resolveSource,
  toDirectEditStatusFailure,
} from "../direct-edit/index.js";
import { attemptKnown } from "./deps.js";
import type { FixBreakpoint } from "./engine/fix-rules.js";

type FixMode = "classes" | "css" | "none";

interface FixSite {
  readonly breakpoints: readonly FixBreakpoint[];
  readonly classes: readonly string[];
  readonly loc: SourceLoc;
  readonly mode: FixMode;
  readonly text: string;
}

interface SiteScope {
  readonly projectKind: Parameters<typeof elementClassInfo>[1];
  readonly workTree: string;
}

const LOC_FORMAT = /^(?<file>.+):(?<line>\d+):(?<column>\d+)$/u;

const HTML_EXTENSIONS: ReadonlySet<string> = new Set([".htm", ".html"]);

const toSourceLoc = (text: string): SourceLoc | null => {
  const groups = LOC_FORMAT.exec(text)?.groups ?? null;

  if (groups === null) {
    return null;
  }

  return {
    col: Number(groups["column"]),
    file: groups["file"] ?? "",
    line: Number(groups["line"]),
  };
};

const isHtmlFile = (file: string): boolean =>
  HTML_EXTENSIONS.has(path.extname(file).toLowerCase());

const toMode = (isClasses: boolean, file: string): FixMode => {
  if (isClasses) {
    return "classes";
  }

  if (isHtmlFile(file)) {
    return "css";
  }

  return "none";
};

const getHtmlText = Effect.fn("getHtmlText")(function* run(
  scope: SiteScope,
  loc: SourceLoc,
  mode: FixMode
) {
  if (mode !== "css") {
    return "";
  }

  const resolved = yield* attemptKnown(
    () => resolveSource(scope.workTree, loc.file),
    toDirectEditStatusFailure
  );

  return yield* attemptKnown(() => readFile(resolved.file, "utf-8"));
});

const inspectSite = Effect.fn("inspectSite")(function* run(
  scope: SiteScope,
  locText: string
) {
  const loc = toSourceLoc(locText);

  if (loc === null) {
    return null;
  }

  const info = yield* attemptKnown(
    () => elementClassInfo(scope.workTree, scope.projectKind, loc),
    toDirectEditStatusFailure
  ).pipe(Effect.orElseSucceed(() => null));

  if (info === null) {
    return null;
  }

  const isClasses = info.tailwind?.mode === "classes";
  const mode = toMode(isClasses, loc.file);

  const text = yield* getHtmlText(scope, loc, mode).pipe(
    Effect.orElseSucceed(() => "")
  );

  const site: FixSite = {
    breakpoints: info.variants.breakpoints,
    classes: info.tailwind?.classes ?? [],
    loc,
    mode,
    text,
  };

  return site;
});

export { inspectSite };

export type { FixMode, FixSite, SiteScope };
