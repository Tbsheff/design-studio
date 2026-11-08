import type { Dirent } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../platform/errors/index.js";
import { toHtmlScreen, toTitleCase } from "./engine/index.js";
import { HTML_GROUP } from "./screen-model.js";
import type {
  CreateScreenCommand,
  DuplicateScreenCommand,
  InspectScope,
  LayoutGroupInfo,
  ScreenPlan,
  ScreenScope,
  ScreenWritePlan,
} from "./screen-model.js";
import { hasPath, listEntries, toPosix } from "./screen-source.js";

const PAGES_MAX = 300;

const DEPTH_MAX = 4;

const SAMPLES_MAX = 3;

const SKIPPED = new Set(["node_modules", "dist", "build", "out"]);

const FILE_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9\-_.~]*$/u;

const isHtmlFile = (entry: Dirent): boolean =>
  entry.isFile() && entry.name.endsWith(".html");

const isPagesFolder = (entry: Dirent, depth: number): boolean =>
  entry.isDirectory() &&
  depth < DEPTH_MAX &&
  !entry.name.startsWith(".") &&
  !SKIPPED.has(entry.name);

const listPagesIn = async (
  root: string,
  folder: string,
  depth: number
): Promise<readonly string[]> => {
  const entries = await listEntries(path.join(root, folder));

  const files = entries.flatMap((entry) => {
    if (isHtmlFile(entry)) {
      return [path.posix.join(folder, entry.name)];
    }

    return [];
  });

  const folders = entries.flatMap((entry) => {
    if (isPagesFolder(entry, depth)) {
      return [path.posix.join(folder, entry.name)];
    }

    return [];
  });

  const nested = await Promise.all(
    folders.map((relative) => listPagesIn(root, relative, depth + 1))
  );

  return [...files, ...nested.flat()];
};

const listHtmlPages = async (workTree: string): Promise<readonly string[]> => {
  const pages = await listPagesIn(workTree, "", 0);

  return pages.toSorted().slice(0, PAGES_MAX);
};

const toHtmlFile = (raw: string): string => {
  const cleaned = raw.trim().split(/[?#]/u)[0] ?? "";
  const parts = cleaned.split("/").filter((part) => part !== "");
  const last = parts.at(-1) ?? "";

  if (parts.length === 0 || parts.length > DEPTH_MAX + 1) {
    throw new BadRequestError(
      "Give a page file such as about.html or states/empty.html."
    );
  }

  if (!parts.every((part) => FILE_SEGMENT.test(part))) {
    throw new BadRequestError(
      `The page path ${raw} has a character that a page file cannot use.`
    );
  }

  if (last.endsWith(".html")) {
    return parts.join("/");
  }

  return `${parts.join("/")}.html`;
};

const toSamplePage = (pages: readonly string[]): string | null => {
  if (pages.includes("index.html")) {
    return "index.html";
  }

  return pages[0] ?? null;
};

const toHtmlGroup = (pages: readonly string[]): LayoutGroupInfo => ({
  isAuthRequired: false,
  layoutFile: null,
  name: HTML_GROUP,
  sampleRoutes: pages.slice(0, SAMPLES_MAX),
  shellComponents: [],
});

const toHtmlInspect = async (
  scope: InspectScope,
  raw: string
): Promise<ScreenPlan> => {
  const { workTree } = scope.direction;
  const file = toHtmlFile(raw);

  const [pages, isTaken] = await Promise.all([
    listHtmlPages(workTree),
    hasPath(path.join(workTree, file)),
  ]);

  return { filePath: file, groups: [toHtmlGroup(pages)], isPathFree: !isTaken };
};

const toHtmlTitle = (file: string): string =>
  toTitleCase(path.posix.basename(file, ".html"));

const toHtmlCreatePlan = async (
  scope: ScreenScope,
  command: CreateScreenCommand
): Promise<ScreenWritePlan> => {
  const { workTree } = scope.direction;
  const file = toHtmlFile(command.path);

  if (command.group !== null && command.group !== HTML_GROUP) {
    throw new BadRequestError(
      `An HTML project has one group, ${HTML_GROUP}. Use it or leave group empty.`
    );
  }

  const [isTaken, pages] = await Promise.all([
    hasPath(path.join(workTree, file)),
    listHtmlPages(workTree),
  ]);

  if (isTaken) {
    throw new ConflictError(`The page ${file} exists already.`);
  }

  const sample = toSamplePage(pages);
  let sampleHtml = "";

  if (sample !== null) {
    sampleHtml = await readFile(path.join(workTree, sample), "utf-8");
  }

  const title = command.title.trim() || toHtmlTitle(file);
  const code = toHtmlScreen({ layout: command.layout, sampleHtml, title });

  return {
    files: [{ code, relative: toPosix(file) }],
    framePath: file,
    label: title,
    rightOfPath: null,
    rollbackRoot: null,
    route: `/${file}`,
    versionTitle: `Create screen ${file}`,
  };
};

const toHtmlDuplicatePlan = async (
  scope: ScreenScope,
  command: DuplicateScreenCommand
): Promise<ScreenWritePlan> => {
  const { workTree } = scope.direction;
  const from = toHtmlFile(command.from);
  const file = toHtmlFile(command.path);

  const [hasSource, isTaken] = await Promise.all([
    hasPath(path.join(workTree, from)),
    hasPath(path.join(workTree, file)),
  ]);

  if (!hasSource) {
    throw new NotFoundError(`No page file ${from}. Pass an existing page.`);
  }

  if (isTaken) {
    throw new ConflictError(`The page ${file} exists already.`);
  }

  const code = await readFile(path.join(workTree, from), "utf-8");

  return {
    files: [{ code, relative: file }],
    framePath: file,
    label: toHtmlTitle(file),
    rightOfPath: from,
    rollbackRoot: null,
    route: `/${file}`,
    versionTitle: `Duplicate screen ${from} to ${file}`,
  };
};

export { toHtmlCreatePlan, toHtmlDuplicatePlan, toHtmlInspect };
