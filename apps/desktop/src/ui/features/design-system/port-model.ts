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

const toRouteError = (route: string, picked: PortFlowPage[]): string | null => {
  if (!cleanPortRoute(route)) {
    return ROUTE_HINT;
  }

  return toTakenText(picked.filter((page) => page.routeExists));
};

const toRouteProblem = (
  typed: string | null,
  shown: string,
  picked: PortFlowPage[]
): string | null => {
  if (typed === null && !shown) {
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

const toWritesText = (count: number, appName: string): string => {
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
  toShownRoute,
  toStartedText,
};

export type { PortTarget, PortFrameOption };
