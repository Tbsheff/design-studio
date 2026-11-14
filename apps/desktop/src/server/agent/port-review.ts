import type {
  PortDiff,
  PortElement,
  PortFirstShift,
  PortMasked,
} from "@design-studio/actions/port/schema";
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
import { toRouteFileNow } from "./port-route-update.js";
import type { ImagePart } from "./user-message.js";

const CHECK_TAG = /<port-check\b(?<attributes>[^>]*)\/>/u;

const ROUTE_FILE = /`(?<file>[^`\s]+\/page\.[jt]sx?)`/gu;

const GROUP_SEGMENT = /^\(.*\)$/u;

const CONTINUE_TAG = "studio-continue";

const MASKED_TEXT_MAX = 5;

const SECOND_LOOP_MS = 60_000;

const HID_ROWS = /^Hid \d+ extra data rows? on the \w+ page\.$/u;

interface PortCheckRef {
  readonly directionId: string;
  readonly path: string;
  readonly projectId: string;
  readonly routePath: string;
  readonly targetProjectId: string;
}

interface PortReviewGaps {
  readonly files: readonly string[];
  readonly isUpdate: boolean;
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

const hasEdit = (toolOrder: readonly string[]): boolean =>
  toolOrder.some((name) => EDIT_TOOL_NAMES.has(name));

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

  if (!isPortRun(ctx) || !hasEdit(toolOrder)) {
    return null;
  }

  if (base === null || checkRef === null) {
    return null;
  }

  return {
    files: toRouteFiles(ctx.request.prompt),
    isUpdate: toRouteFileNow(ctx.request.prompt) !== null,
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

const toRouteKind = (gaps: PortReviewGaps): string => {
  if (gaps.isUpdate) {
    return "updated";
  }

  return "new";
};

const toMaskedTexts = (
  match: PortMatchRead,
  reason: PortMasked["reason"]
): string[] =>
  match.masked.flatMap((item) => {
    if (item.reason === reason) {
      return [item.text];
    }

    return [];
  });

const toMaskedLines = (match: PortMatchRead): string[] => {
  const kept = toMaskedTexts(match, "app-change");
  const rows = toMaskedTexts(match, "data-row");
  const lines: string[] = [];

  if (kept.length > 0) {
    lines.push(
      `- Kept app text, not scored: "${kept.join('" / "')}". The studio hides it in the app shot, so give the elements around it the prototype spacing, as if it were not there.`,
      "  Do not edit the kept app text or its margins."
    );
  }

  if (rows.length > 0) {
    lines.push(
      `- Data row text, not scored (the app data differs from the prototype sample rows): ${rows.slice(0, MASKED_TEXT_MAX).join(" / ")}`
    );
  }

  return lines;
};

const toDiffText = (diff: PortDiff): string =>
  `${diff.property} app ${diff.app}, prototype ${diff.prototype}`;

const toDiffsText = (diffs: readonly PortDiff[]): string =>
  diffs.map((diff) => toDiffText(diff)).join("; ");

const toElementName = (element: PortElement): string =>
  `${element.selector} "${element.text}"`;

const toElementText = (element: PortElement): string => {
  if (element.diffs.length === 0) {
    return toElementName(element);
  }

  return `${toElementName(element)} (${toDiffsText(element.diffs)})`;
};

const toShiftWay = (shift: number): string => {
  if (shift < 0) {
    return "higher";
  }

  return "lower";
};

const toAboveText = (above: PortElement): string => {
  if (above.diffs.length === 0) {
    return `Above it, ${toElementName(above)}: no measured value differs; check the space between them.`;
  }

  return `Above it, ${toElementName(above)}: ${toDiffsText(above.diffs)}. Give it the prototype values; it is not kept text.`;
};

const toShiftLines = (shift: PortFirstShift | null): string[] => {
  if (shift === null) {
    return [];
  }

  const parts = [
    `- First shift: content from ${shift.element.selector} is ${Math.abs(shift.shift)}px ${toShiftWay(shift.shift)} than the prototype.`,
  ];

  if (shift.element.diffs.length > 0) {
    parts.push(`Its own values: ${toDiffsText(shift.element.diffs)}.`);
  }

  if (shift.above !== null) {
    parts.push(toAboveText(shift.above));
  }

  return [parts.join(" ")];
};

const toAreaLine = (area: PortMatchRead["areas"][number]): string => {
  const names = area.elements.map((element) => toElementText(element));

  if (names.length === 0) {
    return `- ${area.name} ${area.score}: no named element; check the spacing and the background there.`;
  }

  return `- ${area.name} ${area.score}: ${names.join(", ")}`;
};

const toAreaLines = (match: PortMatchRead): string[] => {
  if (match.areas.length === 0) {
    return [];
  }

  return [
    "Low areas and the app elements in them:",
    ...match.areas.map((area) => toAreaLine(area)),
  ];
};

const toFixPrompt = (gaps: PortReviewGaps, check: PortCheck): string =>
  [
    toTag(CONTINUE_TAG, false),
    `The studio checked the ${toRouteKind(gaps)} route ${gaps.ref.routePath} (${gaps.url}) against the prototype after your last edit.`,
    `- Render: ${toRenderText(check.render)}.`,
    `- Port match against the prototype ${gaps.ref.path}: ${toScoreText(check.match)}. The bar is ${REFERENCE_LOW_SCORE}.`,
    ...toShiftLines(check.match.firstShift),
    ...toMaskedLines(check.match),
    ...toAreaLines(check.match),
    "The attached sheet, when there is one, shows the prototype, the route, and the different pixels in red.",
    "Do one fix loop. Fix the render error first, then the low areas, with the app kit and tokens. Do not call inspect_port: the studio checks the route again after your reply. Reply in one or two sentences with what you changed.",
    toTag(CONTINUE_TAG, true),
  ].join("\n");

const toHidText = (check: PortCheck): string => {
  const hid =
    check.match.masked.find((item) => HID_ROWS.test(item.text)) ?? null;

  if (hid === null) {
    return "";
  }

  return `; ${hid.text.charAt(0).toLowerCase()}${hid.text.slice(1, -1)}`;
};

const toNote = (checks: readonly PortCheck[]): string => {
  const first = checks[0] ?? null;
  const second = checks[1] ?? null;
  const third = checks[2] ?? null;

  if (first === null) {
    return "";
  }

  if (second === null) {
    return `Studio port check: ${toCheckText(first)}${toHidText(first)}.`;
  }

  if (third === null) {
    return `Studio port check: ${toCheckText(first)}, a fix loop ran; after it ${toCheckText(second)}${toHidText(second)}.`;
  }

  return `Studio port check: ${toCheckText(first)}, 2 fix loops ran; after the first ${toCheckText(second)}; after the second ${toCheckText(third)}${toHidText(third)}.`;
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

const runFixLoop = async (
  input: PortReviewInput,
  check: PortCheck
): Promise<PortCheck | null> => {
  const isRan = await input.continueWith(
    toFixPrompt(input.gaps, check),
    check.match.images
  );

  if (!isRan) {
    return null;
  }

  return inspectRoute(input);
};

const isRaised = (first: PortCheck, next: PortCheck): boolean =>
  first.match.score !== null &&
  next.match.score !== null &&
  next.match.score > first.match.score;

const isSecondLoop = (
  first: PortCheck,
  next: PortCheck,
  loopMs: number
): boolean =>
  loopMs <= SECOND_LOOP_MS && isRaised(first, next) && isFixNeeded(next);

const toReview = (checks: readonly PortCheck[]): PortReview => {
  const last = checks.at(-1) ?? null;

  if (last === null) {
    return {
      note: "",
      record: { fixLoop: false, rendered: false, score: null },
    };
  }

  return { note: toNote(checks), record: toRecord(last, checks.length > 1) };
};

const runPortReview = async (input: PortReviewInput): Promise<PortReview> => {
  const first = await inspectRoute(input);

  if (!isFixNeeded(first)) {
    return toReview([first]);
  }

  const startedAt = Date.now();
  const second = await runFixLoop(input, first);

  if (second === null) {
    return toReview([first]);
  }

  if (!isSecondLoop(first, second, Date.now() - startedAt)) {
    return toReview([first, second]);
  }

  const third = await runFixLoop(input, second);

  if (third === null) {
    return toReview([first, second]);
  }

  return toReview([first, second, third]);
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
  runPortReview,
  toPortCheckRef,
  toPortChecked,
  toPortReviewGaps,
  toRouteFiles,
};

export type { PortCheckRef, PortContinue, PortReview, PortReviewGaps };
