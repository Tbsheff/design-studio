import type { FinalCheck } from "@design-studio/contracts";
import { PORT_TASK } from "@design-studio/contracts/port";
import type { PortReviewRecord } from "@design-studio/contracts/port";

import { REFERENCE_LOW_SCORE } from "../../shared/reference.js";
import type {
  AgentRunContext,
  PreviewService,
} from "../../shared/server-ports.js";
import { runAgentTool } from "../mcp/index.js";
import type { StudioRuntime } from "../platform/studio-runtime/index.js";
import { isLeanRun } from "./lean-run.js";
import { EDIT_TOOL_NAMES } from "./permissions.js";
import { inspectPortMatch, inspectRouteRender } from "./port-review-read.js";
import type {
  InspectCall,
  PortMatchRead,
  RouteRender,
} from "./port-review-read.js";
import type { ImagePart } from "./user-message.js";

const INSPECT_PORT_TOOL = "mcp__studio__inspect_port";

const CHECK_TAG = /<port-check\b(?<attributes>[^>]*)\/>/u;

const ROUTE_FILE = /`(?<file>[^`\s]+\/page\.[jt]sx?)`/gu;

const GROUP_SEGMENT = /^\(.*\)$/u;

const CONTINUE_TAG = "studio-continue";

interface PortCheckRef {
  readonly directionId: string;
  readonly path: string;
  readonly projectId: string;
  readonly routePath: string;
  readonly targetProjectId: string;
}

interface PortReviewGaps {
  readonly files: readonly string[];
  readonly ref: PortCheckRef;
  readonly url: string;
}

interface PortCheck {
  readonly match: PortMatchRead;
  readonly render: RouteRender;
}

type PortContinue = (
  text: string,
  images: readonly ImagePart[]
) => Promise<boolean>;

interface PortReviewInput {
  readonly continueWith: PortContinue;
  readonly gaps: PortReviewGaps;
  readonly preview: PreviewService;
  readonly runtime: StudioRuntime;
}

interface PortReview {
  readonly note: string;
  readonly record: PortReviewRecord;
}

type PortReviewContext = Pick<AgentRunContext, "previewUrl" | "request">;

const toAttribute = (attributes: string, key: string): string => {
  const found = new RegExp(`\\b${key}="(?<value>[^"]*)"`, "u").exec(attributes);

  return found?.groups?.["value"] ?? "";
};

const toPortCheckRef = (prompt: string): PortCheckRef | null => {
  const attributes = CHECK_TAG.exec(prompt)?.groups?.["attributes"] ?? null;

  if (attributes === null) {
    return null;
  }

  const ref: PortCheckRef = {
    directionId: toAttribute(attributes, "directionId"),
    path: toAttribute(attributes, "path"),
    projectId: toAttribute(attributes, "projectId"),
    routePath: toAttribute(attributes, "routePath"),
    targetProjectId: toAttribute(attributes, "targetProjectId"),
  };

  if (Object.values(ref).includes("")) {
    return null;
  }

  return ref;
};

const toRouteUrl = (base: string, routePath: string): string => {
  const segments = routePath
    .split("/")
    .filter((segment) => segment !== "" && !GROUP_SEGMENT.test(segment));

  return new URL(`/${segments.join("/")}`, base).href;
};

const toRouteFiles = (prompt: string): string[] => [
  ...new Set(
    [...prompt.matchAll(ROUTE_FILE)].map(
      (found) => found.groups?.["file"] ?? ""
    )
  ),
];

const isEditedAfterInspect = (toolOrder: readonly string[]): boolean => {
  const lastEdit = toolOrder.findLastIndex((name) => EDIT_TOOL_NAMES.has(name));

  return lastEdit !== -1 && toolOrder.lastIndexOf(INSPECT_PORT_TOOL) < lastEdit;
};

const isPortRun = (ctx: PortReviewContext): boolean =>
  ctx.request.task === PORT_TASK &&
  ctx.request.mode === "edit" &&
  !isLeanRun(ctx.request);

const toPortReviewGaps = (
  ctx: PortReviewContext,
  toolOrder: readonly string[]
): PortReviewGaps | null => {
  const checkRef = toPortCheckRef(ctx.request.prompt);
  const base = ctx.previewUrl;

  if (!isPortRun(ctx) || !isEditedAfterInspect(toolOrder)) {
    return null;
  }

  if (base === null || checkRef === null) {
    return null;
  }

  return {
    files: toRouteFiles(ctx.request.prompt),
    ref: checkRef,
    url: toRouteUrl(base, checkRef.routePath),
  };
};

const toLowAreaNames = (match: PortMatchRead): string[] =>
  match.areas.map((area) => `${area.name} ${area.score}`);

const isLowMatch = (match: PortMatchRead): boolean =>
  match.score !== null &&
  (match.score < REFERENCE_LOW_SCORE || match.areas.length > 0);

const isFixNeeded = (check: PortCheck): boolean =>
  !check.render.isRendered || isLowMatch(check.match);

const toRenderText = (render: RouteRender): string => {
  if (render.isRendered) {
    return "route renders";
  }

  return `route fails to render (${render.problem})`;
};

const toScoreText = (match: PortMatchRead): string => {
  if (match.score === null) {
    return `no score (${match.error})`;
  }

  const low = toLowAreaNames(match);

  if (low.length === 0) {
    return `score ${match.score}`;
  }

  return `score ${match.score} (${low.join(", ")} under ${REFERENCE_LOW_SCORE})`;
};

const toCheckText = (check: PortCheck): string =>
  `${toScoreText(check.match)}, ${toRenderText(check.render)}`;

const toTag = (name: string, isClose: boolean): string => {
  if (isClose) {
    return ["</", name, ">"].join("");
  }

  return ["<", name, ">"].join("");
};

const toFixPrompt = (gaps: PortReviewGaps, check: PortCheck): string =>
  [
    toTag(CONTINUE_TAG, false),
    `The studio checked the new route ${gaps.ref.routePath} (${gaps.url}) after your last edit, because you did not call inspect_port after it.`,
    `- Render: ${toRenderText(check.render)}.`,
    `- Port match against the prototype ${gaps.ref.path}: ${toScoreText(check.match)}. The bar is ${REFERENCE_LOW_SCORE}.`,
    "The attached sheet, when there is one, shows the prototype, the route, and the different pixels in red.",
    "Do one fix loop. Fix the render error first, then the low areas, with the app kit and tokens. Then call inspect_port once with the five values of the port-check tag and reply in one or two sentences with the new score.",
    toTag(CONTINUE_TAG, true),
  ].join("\n");

const toNote = (first: PortCheck, last: PortCheck | null): string => {
  if (last === null) {
    return `Studio port check: ${toCheckText(first)}.`;
  }

  return `Studio port check: ${toCheckText(first)}, a fix loop ran; after it ${toCheckText(last)}.`;
};

const toRecord = (check: PortCheck, isFixLoop: boolean): PortReviewRecord => ({
  fixLoop: isFixLoop,
  rendered: check.render.isRendered,
  score: check.match.score,
});

const inspectRoute = async (input: PortReviewInput): Promise<PortCheck> => {
  const inspect: InspectCall = (name, body) =>
    runAgentTool(input.runtime, name, body);

  const [match, render] = await Promise.all([
    inspectPortMatch(inspect, input.gaps.ref),
    inspectRouteRender(input.preview, input.gaps.url, input.gaps.files),
  ]);

  return { match, render };
};

const runPortReview = async (input: PortReviewInput): Promise<PortReview> => {
  const first = await inspectRoute(input);

  if (!isFixNeeded(first)) {
    return { note: toNote(first, null), record: toRecord(first, false) };
  }

  const isRan = await input.continueWith(
    toFixPrompt(input.gaps, first),
    first.match.images
  );

  if (!isRan) {
    return { note: toNote(first, null), record: toRecord(first, false) };
  }

  const last = await inspectRoute(input);

  return { note: toNote(first, last), record: toRecord(last, true) };
};

const EMPTY_CHECK: FinalCheck = {
  errors: 0,
  high: 0,
  low: 0,
  medium: 0,
  ranBy: "studio",
};

const toPortChecked = (
  check: FinalCheck | undefined,
  record: PortReviewRecord | null
): FinalCheck | undefined => {
  if (record === null) {
    return check;
  }

  return { ...(check ?? EMPTY_CHECK), port: record };
};

export {
  INSPECT_PORT_TOOL,
  runPortReview,
  toPortCheckRef,
  toPortChecked,
  toPortReviewGaps,
  toRouteFiles,
};

export type { PortCheckRef, PortContinue, PortReview, PortReviewGaps };
