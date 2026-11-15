import {
  cleanPortRoute,
  PORT_LEVEL_LABEL,
} from "@design-studio/contracts/port";
import type {
  PortFlowPage,
  PortFlowPlan,
  PortKitMatch,
  PortStartResult,
} from "@design-studio/contracts/port";

import { toChoice } from "./choose-text.js";
import { COPY } from "./copy.js";

interface PortFrameOption {
  id: string;
  isActive: boolean;
  label: string;
  path: string;
}

interface PortRouteUpdate {
  file: string;
  isChanged: boolean;
}

interface PortCopySource {
  appProjectId: string | null;
  isChanged: boolean;
  routePath: string | null;
}

interface PortTarget {
  projectId: string;
  directionId: string | null;
  frameId: string | null;
}

const ROUTE_HINT =
  "Use an app path like /classes. Lower-case letters, digits and dashes; a route group in parentheses, like /(design)/classes, is allowed.";

const toCleanRoute = (route: string | null): string | null => {
  if (route === null) {
    return null;
  }

  return cleanPortRoute(route);
};

const toPagePath = (path: string | null): string => {
  const clean = (path ?? "").replace(/^\/+/u, "");

  return clean || "index.html";
};

const toFirstFrameId = (
  frames: PortFrameOption[],
  wanted: string | null
): string =>
  frames.find((frame) => frame.id === wanted)?.id ??
  frames.find((frame) => frame.isActive)?.id ??
  frames[0]?.id ??
  "";

const toShownRoute = (
  typed: string | null,
  flow: PortFlowPlan | null,
  path: string
): string => {
  if (typed !== null) {
    return typed;
  }

  if (flow?.source.entry === path) {
    return flow.base ?? "";
  }

  return "";
};

const toTakenText = (taken: PortFlowPage[]): string | null => {
  if (taken.length === 1) {
    return `The app already has the route ${taken[0]?.url} (${taken[0]?.routeFile}). Pick a new path.`;
  }

  if (taken.length > 1) {
    return `The app already has ${taken.length} of these routes (${taken.map((page) => page.url).join(", ")}). Pick a new path.`;
  }

  return null;
};

const toTakenPages = (picked: PortFlowPage[]): PortFlowPage[] => {
  if (picked.length > 1) {
    return [];
  }

  return picked.filter((page) => page.routeExists);
};

const toRouteError = (route: string, picked: PortFlowPage[]): string | null => {
  if (!cleanPortRoute(route)) {
    return ROUTE_HINT;
  }

  return toTakenText(toTakenPages(picked));
};

const DYNAMIC_PART = /^\[[^\]/]+\]$/u;

const CATCH_ALL_PART = /^\[\.{3}[^\]/]+\]$/u;

const OPTIONAL_PART = /^\[\[\.{3}[^\]/]+\]\]$/u;

const GROUP_PART = /^\(.*\)$/u;

const toRouteParts = (route: string): string[] =>
  route.split("/").filter((part) => part !== "" && !GROUP_PART.test(part));

const toTailMin = (last: string): number | null => {
  if (OPTIONAL_PART.test(last)) {
    return 0;
  }

  if (CATCH_ALL_PART.test(last)) {
    return 1;
  }

  return null;
};

const isPartOf = (part: string, actual: string | undefined): boolean =>
  part === actual || DYNAMIC_PART.test(part);

const isHeadOf = (head: string[], actual: string[]): boolean =>
  head.length <= actual.length &&
  head.entries().every(([index, part]) => isPartOf(part, actual[index]));

const isPartsOf = (parts: string[], actual: string[]): boolean => {
  const tailMin = toTailMin(parts.at(-1) ?? "");

  if (tailMin === null) {
    return (
      parts.some((part) => DYNAMIC_PART.test(part)) &&
      parts.length === actual.length &&
      isHeadOf(parts, actual)
    );
  }

  const head = parts.slice(0, -1);

  return actual.length >= head.length + tailMin && isHeadOf(head, actual);
};

const isPatternOf = (pattern: string, route: string | null): boolean =>
  route !== null && isPartsOf(toRouteParts(pattern), toRouteParts(route));

const toEntryPage = (flow: PortFlowPlan | null): PortFlowPage | null =>
  flow?.pages.find((page) => page.path === flow.source.entry) ?? null;

const toSourceRoute = (
  source: PortCopySource | null,
  appId: string,
  flow: PortFlowPlan | null
): string | null => {
  if (source === null || source.appProjectId !== appId) {
    return null;
  }

  const page = toEntryPage(flow);

  if (page?.routeExists && isPatternOf(page.route, source.routePath)) {
    return page.route;
  }

  return source.routePath;
};

const isSameRoute = (left: string, right: string | null): boolean => {
  const clean = toCleanRoute(left);

  return clean !== null && clean !== "" && clean === toCleanRoute(right);
};

const toFixturePattern = (
  routeText: string,
  picked: PortFlowPage[]
): string | null => {
  const page = picked[0] ?? null;

  if (page === null || picked.length !== 1 || !page.routeExists) {
    return null;
  }

  if (isSameRoute(routeText, page.route)) {
    return null;
  }

  if (!isPatternOf(page.route, toCleanRoute(routeText))) {
    return null;
  }

  return page.route;
};

const toFixtureText = (pattern: string): string =>
  `${COPY.textThisPageIsACopyOf}${pattern}${COPY.textMoveItTo}${pattern}${COPY.textOrTypeANewRoute}`;

const toRouteUpdate = (
  source: PortCopySource | null,
  appId: string,
  routeText: string,
  picked: PortFlowPage[]
): PortRouteUpdate | null => {
  const page = picked[0] ?? null;
  const sourceRoute = toSourceRoute(source, appId, null);

  if (source === null || page === null || picked.length !== 1) {
    return null;
  }

  if (toFixturePattern(routeText, picked) !== null) {
    return null;
  }

  if (!page.routeExists || !page.routeFile) {
    return null;
  }

  const isPattern =
    isSameRoute(routeText, page.route) && isPatternOf(page.route, sourceRoute);

  if (!isSameRoute(routeText, sourceRoute) && !isPattern) {
    return null;
  }

  return { file: page.routeFile, isChanged: source.isChanged };
};

const toRouteProblem = (
  typed: string | null,
  shown: string,
  picked: PortFlowPage[],
  update: PortRouteUpdate | null
): string | null => {
  const pattern = toFixturePattern(shown, picked);

  if (pattern !== null) {
    return toFixtureText(pattern);
  }

  if ((typed === null && !shown) || update !== null) {
    return null;
  }

  return toRouteError(shown, picked);
};

const toKitList = (pages: PortFlowPage[]): PortKitMatch[] => {
  const seen = new Map<string, PortKitMatch>();

  for (const page of pages) {
    for (const match of page.plan.kit) {
      if (!seen.has(match.name)) {
        seen.set(match.name, match);
      }
    }
  }

  return [...seen.values()];
};

const toSinglePageText = (first: PortFlowPage["plan"]): string => {
  const cards = first.repeats.find((repeat) => repeat.role === "card");
  const parts = [`${first.sections.length} sections`];

  if (cards) {
    parts.push(`${cards.count} cards`);
  }

  if (first.steps.length > 0) {
    parts.push(`${first.steps.length} steps`);
  }

  parts.push(`${first.links.length} links`);

  return parts.join(", ");
};

const toContentText = (pages: PortFlowPage[], links: number): string => {
  const first = pages[0]?.plan;

  if (!first) {
    return "No page picked";
  }

  if (pages.length === 1) {
    return toSinglePageText(first);
  }

  const sections = pages.reduce(
    (sum, page) => sum + page.plan.sections.length,
    0
  );

  return `${pages.length} pages, ${sections} sections, ${links} links between pages`;
};

const toStartedText = (result: PortStartResult): string => {
  const count = result.routes?.length ?? 1;

  if (count > 1) {
    return `${count} routes under ${result.route}`;
  }

  return result.route;
};

const toNoteClass = (isError: boolean): string =>
  toChoice(isError, "port-note error", "port-note");

const toFlowWritesText = (
  count: number,
  appName: string,
  updated: number
): string => {
  const fresh = count - updated;
  const many = [updated, COPY.textRouteFilesInPlace].join(" ");
  const kept = toChoice(updated > 1, many, COPY.textOneRouteFileInPlace);
  const parts = [`${COPY.textUpdates}${kept}`];

  if (fresh > 0) {
    const added = [fresh, COPY.textNewRouteFiles].join(" ");
    const files = toChoice(fresh > 1, added, COPY.textOneNewRouteFile);
    parts.push(`${COPY.textAndWrites}${files}`);
  }

  return `${parts.join(" ")} ${COPY.textIn}${appName}${COPY.textGlyph2}`;
};

const toWritesText = (
  count: number,
  appName: string,
  update: PortRouteUpdate | null,
  updated: number
): string => {
  if (update !== null) {
    return `${COPY.textUpdates}${update.file} ${COPY.textIn}${appName}${COPY.textGlyph2}`;
  }

  if (count > 1 && updated > 0) {
    return toFlowWritesText(count, appName, updated);
  }

  const files = toChoice(
    count > 1,
    `${count} ${COPY.textNewRouteFiles}`,
    COPY.textOneNewRouteFile
  );

  return `${COPY.textWrites}${files} ${COPY.textIn}${appName}${COPY.textGlyph2}`;
};

const toStartedLine = (result: PortStartResult, appName: string): string =>
  `${COPY.textStartedA}${PORT_LEVEL_LABEL} ${COPY.textRunIn}${appName} ${COPY.textFor}${toStartedText(result)}${COPY.textGlyph2}`;

export {
  toNoteClass,
  toStartedLine,
  toWritesText,
  toCleanRoute,
  toContentText,
  toFirstFrameId,
  toKitList,
  toPagePath,
  toRouteProblem,
  toRouteUpdate,
  toShownRoute,
  toSourceRoute,
  toStartedText,
};

export type { PortCopySource, PortRouteUpdate, PortTarget, PortFrameOption };
