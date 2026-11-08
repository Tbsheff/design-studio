import { SOURCE_LOC_ATTR } from "@design-studio/contracts";
import type { InsertTarget } from "@design-studio/contracts/insert";

import type { DirectionRun } from "./deps.js";
import { BlockError } from "./errors.js";

interface BlockTargetRequest {
  readonly run: DirectionRun;
  readonly selector: string | null;
  readonly source: string | null;
}

interface FoundElement {
  readonly loc: string;
  readonly selector: string;
  readonly tag: string;
}

const SOURCE_LOCATION = /^(?<file>.+):(?<line>\d+):(?<col>\d+)$/u;

const DEFAULT_SELECTORS = ["main", "#root > *", "#__next > *", "body"];

const VIEWPORT = { height: 900, width: 1440 } as const;

const WAIT_MS = 6000;

const toSourceLoc = (text: string): InsertTarget["source"] => {
  const groups = SOURCE_LOCATION.exec(text.trim())?.groups ?? null;

  if (groups === null) {
    return null;
  }

  return {
    col: Number(groups["col"]),
    file: groups["file"] ?? "",
    line: Number(groups["line"]),
  };
};

const toProbeExpression = (selectors: readonly string[]): string =>
  `(async () => {
    const selectors = ${JSON.stringify(selectors)};
    const until = Date.now() + ${WAIT_MS};
    do {
      for (const selector of selectors) {
        let element = null;
        try { element = document.querySelector(selector); } catch { element = null; }
        const loc = element ? element.getAttribute(${JSON.stringify(SOURCE_LOC_ATTR)}) : null;
        if (element && loc) {
          return { loc, selector, tag: element.tagName.toLowerCase() };
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 150));
    } while (Date.now() < until);
    return null;
  })()`;

const getFoundElement = async (
  run: DirectionRun,
  selectors: readonly string[]
): Promise<FoundElement | null> => {
  const { direction, project, runtime } = run;
  const { preview } = runtime;

  if (!preview.withPage) {
    throw new BlockError("The preview cannot run a page probe in this build.");
  }

  const url = await preview.directionUrl(project, direction);

  return await preview.withPage(url, VIEWPORT, (page) =>
    page.evaluate<FoundElement | null>(toProbeExpression(selectors))
  );
};

const toElementTarget = async (
  run: DirectionRun,
  selectors: readonly string[],
  label: string
): Promise<InsertTarget> => {
  const found = await getFoundElement(run, selectors);
  const source = toSourceLoc(found?.loc ?? "");

  if (found === null || source === null) {
    throw new BlockError(
      `The target ${label} is not on the page, or it has no source location. Pass targetSource as file:line:col.`
    );
  }

  const { tag } = found;

  return { selector: found.selector, source, tag };
};

const toBlockTarget = async (
  request: BlockTargetRequest
): Promise<InsertTarget> => {
  const { run, selector, source } = request;

  if (source !== null) {
    const located = toSourceLoc(source);

    if (located === null) {
      throw new BlockError(
        `The source ${source} is not a file:line:col source location.`
      );
    }

    return { source: located };
  }

  if (selector !== null) {
    return await toElementTarget(run, [selector.trim()], selector);
  }

  return await toElementTarget(run, DEFAULT_SELECTORS, "main");
};

export { toBlockTarget };
