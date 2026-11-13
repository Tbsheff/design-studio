import { readFile } from "node:fs/promises";

import type {
  PageMatch,
  PageMatches,
  PageMatchTarget,
} from "@design-studio/actions/page/match/schema";
import { PAGE_MATCH_MAX } from "@design-studio/actions/page/match/schema";
import type { Project } from "@design-studio/contracts";

import { resolveSource } from "../../direct-edit/index.js";
import type { DirectionRun } from "../../direct-edit/index.js";
import { BadRequestError, NotFoundError } from "../../platform/errors/index.js";
import { toPageHit, toPageSource } from "./engine/to-page-matches.js";
import type { PageSource } from "./engine/to-page-matches.js";

interface PageMatchQuery {
  readonly file: string;
  readonly selector: string;
  readonly versionId: string | null;
}

interface PageMatchCommand {
  readonly file: string;
  readonly selector: string;
  readonly targets: readonly PageMatchTarget[];
}

const HTML_PAGE = /\.html?$/iu;

const SKIP_DIR = /(?:^|\/)(?:node_modules|\.[^/]+|dist|build)\//u;

const TEXT = new TextDecoder();

const NOT_HTML =
  "Shared layers work only in HTML projects. In a React project, edit the shared component.";

const toMissing = (selector: string, file: string): string =>
  `No element matches ${selector} in ${file}. Select the layer again.`;

const toHtmlProject = (project: Project): Project => {
  if (project.kind !== "html") {
    throw new BadRequestError(NOT_HTML);
  }

  return project;
};

const toPagePath = (raw: string | undefined): string => {
  const clean = (raw ?? "").replace(/^\/+/u, "").split(/[?#]/u)[0] ?? "";

  if (clean === "") {
    return "index.html";
  }

  return clean;
};

const toFrameIds = async (
  run: DirectionRun
): Promise<ReadonlyMap<string, string>> => {
  const read = await run.runtime.canvas.read(run.project);
  const frames = read.canvas?.frames ?? [];
  const ids = new Map<string, string>();

  for (const frame of frames) {
    const owner = frame.directionId ?? run.direction.id;
    const page = toPagePath(frame.path);

    if (owner === run.direction.id && !ids.has(page)) {
      ids.set(page, frame.id);
    }
  }

  return ids;
};

const toSourceText = async (
  run: DirectionRun,
  relative: string,
  file: string,
  versionId: string | null
): Promise<string> => {
  if (versionId === null) {
    return await readFile(file, "utf-8");
  }

  const bytes = await run.runtime.editDeps.versions.fileAt?.(
    run.project,
    versionId,
    relative
  );

  if (!bytes) {
    throw new NotFoundError(`${relative} is not in version ${versionId}.`);
  }

  return TEXT.decode(bytes);
};

const toSource = (text: string, selector: string, file: string): PageSource => {
  const source = toPageSource(text, selector);

  if (source === null) {
    throw new NotFoundError(toMissing(selector, file));
  }

  return source;
};

const toPages = async (
  run: DirectionRun,
  own: string
): Promise<readonly string[]> => {
  const all = await run.runtime.listWorkTree(run.direction.workTree);

  return all
    .filter(
      (page) => HTML_PAGE.test(page) && !SKIP_DIR.test(page) && page !== own
    )
    .toSorted()
    .slice(0, PAGE_MATCH_MAX);
};

const toPageMatch = async (
  run: DirectionRun,
  source: PageSource,
  page: string,
  frames: ReadonlyMap<string, string>
): Promise<PageMatch | null> => {
  const target = await resolveSource(run.direction.workTree, page);
  const hit = toPageHit(source, await readFile(target.file, "utf-8"));

  if (hit === null) {
    return null;
  }

  return {
    file: target.relative,
    frameId: frames.get(target.relative) ?? null,
    isSame: hit.isSame,
    selector: hit.selector,
  };
};

const inspectPageMatches = async (
  run: DirectionRun,
  query: PageMatchQuery
): Promise<PageMatches> => {
  toHtmlProject(run.project);
  const own = await resolveSource(run.direction.workTree, query.file);
  const text = await toSourceText(run, own.relative, own.file, query.versionId);
  const source = toSource(text, query.selector, own.relative);

  const [pages, frames] = await Promise.all([
    toPages(run, own.relative),
    toFrameIds(run),
  ]);

  const found = await Promise.all(
    pages.map((page) => toPageMatch(run, source, page, frames))
  );

  return {
    items: found.filter((item): item is PageMatch => item !== null),
  };
};

export { toHtmlProject, inspectPageMatches, toSource };

export type { PageMatchCommand, PageMatchQuery };
