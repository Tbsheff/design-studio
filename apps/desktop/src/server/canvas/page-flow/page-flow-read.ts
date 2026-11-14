import { readdir, readFile } from "node:fs/promises";

import type { PageFlow } from "@design-studio/actions/page/flow/schema";
import { PAGE_FLOW_MAX } from "@design-studio/actions/page/flow/schema";

import { resolveSource } from "../../direct-edit/index.js";
import type { DirectionRun } from "../../direct-edit/index.js";
import { BadRequestError, NotFoundError } from "../../platform/errors/index.js";
import { toFlowGaps } from "./engine/to-flow-gaps.js";
import type { FlowPage } from "./engine/to-flow-gaps.js";
import { toFlowLinks } from "./engine/to-flow-links.js";

const START_PAGE = "index.html";

const HTML_PAGE = /\.html?$/iu;

const NOT_HTML =
  "The flow check works only in HTML projects. In a React project, share the parts as components.";

const toEntryMissing = (entry: string): string =>
  `${entry} is not in this design. Give the path of the first page of the flow.`;

const toFlowPage = async (
  workTree: string,
  file: string
): Promise<FlowPage | null> => {
  if (!HTML_PAGE.test(file)) {
    return null;
  }

  try {
    const target = await resolveSource(workTree, file);

    return {
      file: target.relative,
      html: await readFile(target.file, "utf-8"),
    };
  } catch {
    return null;
  }
};

const listFlowPages = async (
  workTree: string,
  pages: readonly FlowPage[],
  level: readonly FlowPage[]
): Promise<readonly FlowPage[]> => {
  const seen = new Set(pages.map((page) => page.file));

  const next = new Set(
    level.flatMap((page) =>
      toFlowLinks(page.file, page.html).filter((file) => !seen.has(file))
    )
  );

  const found = await Promise.all(
    [...next].map((file) => toFlowPage(workTree, file))
  );

  const added = found
    .filter((page): page is FlowPage => page !== null)
    .slice(0, Math.max(PAGE_FLOW_MAX - pages.length, 0));

  if (added.length === 0) {
    return pages;
  }

  return await listFlowPages(workTree, [...pages, ...added], added);
};

const toRootPage = (pages: readonly FlowPage[]): FlowPage | null => {
  const linked = new Set(
    pages.flatMap((page) => toFlowLinks(page.file, page.html))
  );

  return pages.find((page) => !linked.has(page.file)) ?? pages.at(0) ?? null;
};

const toStartPage = async (workTree: string): Promise<FlowPage | null> => {
  const index = await toFlowPage(workTree, START_PAGE);

  if (index !== null) {
    return index;
  }

  const names = await readdir(workTree);

  const pages = await Promise.all(
    names
      .filter((name) => HTML_PAGE.test(name))
      .toSorted()
      .slice(0, PAGE_FLOW_MAX)
      .map((name) => toFlowPage(workTree, name))
  );

  return toRootPage(pages.filter((page): page is FlowPage => page !== null));
};

const toFirstPage = async (
  workTree: string,
  entry: string | null
): Promise<FlowPage> => {
  let first = await toStartPage(workTree);

  if (entry !== null) {
    first = await toFlowPage(workTree, entry);
  }

  if (first === null) {
    throw new NotFoundError(toEntryMissing(entry ?? START_PAGE));
  }

  return first;
};

const inspectFlowPages = async (
  workTree: string,
  entry: string | null
): Promise<PageFlow> => {
  const first = await toFirstPage(workTree, entry);
  const pages = await listFlowPages(workTree, [first], [first]);

  return {
    gaps: toFlowGaps(pages),
    pages: pages.map((page) => page.file),
  };
};

const inspectDirectionFlow = async (
  run: DirectionRun,
  entry: string | null
): Promise<PageFlow> => {
  if (run.project.kind !== "html") {
    throw new BadRequestError(NOT_HTML);
  }

  return await inspectFlowPages(run.direction.workTree, entry);
};

export { inspectDirectionFlow, inspectFlowPages };
