import type {
  PortDiff,
  PortElement,
  PortFirstShift,
  PortMasked,
} from "@design-studio/actions/port/schema";
import type { Direction, FinalCheck, Project } from "@design-studio/contracts";
import { PORT_TASK } from "@design-studio/contracts/port";
import type { PortReviewRecord } from "@design-studio/contracts/port";

import { REFERENCE_LOW_SCORE } from "../../shared/reference.js";
import type {
  AgentRunContext,
  PreviewService,
} from "../../shared/server-ports.js";
import type { PortKitFind } from "../components/kit-drift/index.js";
import type { StudioRuntime } from "../platform/studio-runtime/index.js";
import type { AppDarkCheck } from "./app-review-dark.js";
import { isLeanRun } from "./lean-run.js";
import { EDIT_TOOL_NAMES } from "./permissions.js";
import { hasDarkGap, toDarkText } from "./port-review-dark.js";
import { hasKitGap, toKitLines } from "./port-review-kit.js";
import type { PortMatchRead, RouteRender } from "./port-review-read.js";
import { hasRouteChange, toStartSnapshot } from "./port-review-snapshot.js";
import { toRouteFileNow } from "./port-route-update.js";
import type { RouteFileText } from "./port-route-update.js";
import type { ImagePart } from "./user-message.js";

const CHECK_TAG = /<port-check\b(?<attributes>[^>]*)\/>/gu;

const ROUTE_FILE = /`(?<file>[^`\s]+\/page\.[jt]sx?)`/gu;

const GROUP_SEGMENT = /^\(.*\)$/u;

const CONTINUE_TAG = "studio-continue";

const UPDATE_OPEN = ["<", 'route-update file="'].join("");

const MASKED_TEXT_MAX = 5;

const HID_ROWS = /^Hid \d+ extra data rows? on the \w+ page\.$/u;

interface PortCheckRef {
  readonly directionId: string;
  readonly path: string;
  readonly projectId: string;
  readonly routePath: string;
  readonly targetProjectId: string;
}

interface PortRouteGaps {
  readonly before: RouteFileText | null;
  readonly isUpdate: boolean;
  readonly ref: PortCheckRef;
  readonly url: string;
}

interface PortReviewGaps extends PortRouteGaps {
  readonly appDirectionId: string;
  readonly direction: Direction;
  readonly files: readonly string[];
  readonly project: Project;
  readonly routes: readonly PortRouteGaps[];
  readonly workTree: string;
}

interface PortCheck {
  readonly dark: AppDarkCheck | null;
  readonly kit: readonly PortKitFind[] | null;
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

type PortReviewContext = Pick<
  AgentRunContext,
  "direction" | "previewUrl" | "project" | "request"
>;

const toAttribute = (attributes: string, key: string): string => {
  const found = new RegExp(`\\b${key}="(?<value>[^"]*)"`, "u").exec(attributes);

  return found?.groups?.["value"] ?? "";
};

const toRefOf = (attributes: string): PortCheckRef | null => {
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

const toPortCheckRefs = (prompt: string): PortCheckRef[] =>
  [...prompt.matchAll(CHECK_TAG)].flatMap((found) => {
    const ref = toRefOf(found.groups?.["attributes"] ?? "");

    if (ref === null) {
      return [];
    }

    return [ref];
  });

const toPortCheckRef = (prompt: string): PortCheckRef | null =>
  toPortCheckRefs(prompt)[0] ?? null;

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

const toPathOpen = (tag: string, page: string): string =>
  ["<", tag, ' path="', page, '">'].join("");

const toPageSection = (prompt: string, page: string): string => {
  const start = prompt.indexOf(toPathOpen("port-plan", page));

  const end = prompt.indexOf(toPathOpen("prototype-source", page), start);

  if (start === -1 || end === -1) {
    return "";
  }

  return prompt.slice(start, end);
};

const isRouteUpdate = (
  prompt: string,
  refs: readonly PortCheckRef[],
  ref: PortCheckRef
): boolean => {
  if (refs.length === 1) {
    return toRouteFileNow(prompt) !== null;
  }

  return toPageSection(prompt, ref.path).includes(UPDATE_OPEN);
};

const toBeforeText = (
  prompt: string,
  refs: readonly PortCheckRef[],
  ref: PortCheckRef
): RouteFileText | null => {
  if (refs.length === 1) {
    return toRouteFileNow(prompt);
  }

  return toRouteFileNow(toPageSection(prompt, ref.path));
};

const toCheckGaps = (ctx: PortReviewContext): PortReviewGaps | null => {
  const { prompt } = ctx.request;
  const refs = toPortCheckRefs(prompt);
  const base = ctx.previewUrl;
  const first = refs[0] ?? null;

  if (!isPortRun(ctx) || base === null || first === null) {
    return null;
  }

  const routeGaps = refs.map((checkRef) => ({
    before: toBeforeText(prompt, refs, checkRef),
    isUpdate: isRouteUpdate(prompt, refs, checkRef),
    ref: checkRef,
    url: toRouteUrl(base, checkRef.routePath),
  }));

  return {
    appDirectionId: ctx.direction.id,
    before: routeGaps[0]?.before ?? null,
    direction: ctx.direction,
    files: toRouteFiles(prompt),
    isUpdate: routeGaps[0]?.isUpdate ?? false,
    project: ctx.project,
    ref: first,
    routes: routeGaps,
    url: toRouteUrl(base, first.routePath),
    workTree: ctx.direction.workTree,
  };
};

const toPortGaps = async (
  ctx: PortReviewContext,
  toolOrder: readonly string[]
): Promise<PortReviewGaps | null> => {
  const gaps = toCheckGaps(ctx);

  if (gaps === null || hasEdit(toolOrder)) {
    return gaps;
  }

  const start = toStartSnapshot(ctx.request.prompt, gaps.workTree);

  if (start === null || !(await hasRouteChange(start, gaps.files))) {
    return null;
  }

  return gaps;
};

const toLowAreaNames = (match: PortMatchRead): string[] =>
  match.areas.map((area) => `${area.name} ${area.score}`);

const isLowMatch = (match: PortMatchRead): boolean =>
  match.score !== null &&
  (match.score < REFERENCE_LOW_SCORE || match.areas.length > 0);

const isFixNeeded = (check: PortCheck): boolean =>
  !check.render.isRendered ||
  isLowMatch(check.match) ||
  hasKitGap(check.kit) ||
  hasDarkGap(check.dark);

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
  `${toScoreText(check.match)}, ${toRenderText(check.render)}; ${toDarkText(check.dark)}`;

const toTag = (name: string, isClose: boolean): string => {
  if (isClose) {
    return ["</", name, ">"].join("");
  }

  return ["<", name, ">"].join("");
};

const toRouteKind = (gaps: PortRouteGaps): string => {
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

const toWriteText = (diff: PortDiff): string => {
  if (diff.write === null) {
    return "";
  }

  return ` (write ${diff.write})`;
};

const toDiffText = (diff: PortDiff): string =>
  `${diff.property} app ${diff.app}, prototype ${diff.prototype}${toWriteText(diff)}`;

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

const toFixLines = (gaps: PortRouteGaps, check: PortCheck): string[] => [
  `The studio checked the ${toRouteKind(gaps)} route ${gaps.ref.routePath} (${gaps.url}) against the prototype after your last edit.`,
  `- Render: ${toRenderText(check.render)}.`,
  `- Port match against the prototype ${gaps.ref.path}: ${toScoreText(check.match)}. The bar is ${REFERENCE_LOW_SCORE}.`,
  ...toShiftLines(check.match.firstShift),
  ...toMaskedLines(check.match),
  ...toAreaLines(check.match),
  ...toKitLines(check.kit),
  ...(check.dark?.lines ?? []),
];

const toContinueText = (lines: readonly string[]): string =>
  [
    toTag(CONTINUE_TAG, false),
    ...lines,
    "The attached sheet, when there is one, shows the prototype, the route, and the different pixels in red.",
    "Do one fix loop. Fix the render error first, then the low areas, with the app kit and tokens. Do not call inspect_port: the studio checks the route again after your reply. Reply in one or two sentences with what you changed.",
    toTag(CONTINUE_TAG, true),
  ].join("\n");

const toFixPrompt = (gaps: PortRouteGaps, check: PortCheck): string =>
  toContinueText(toFixLines(gaps, check));

const toHidText = (check: PortCheck): string => {
  const hid =
    check.match.masked.find((item) => HID_ROWS.test(item.text)) ?? null;

  if (hid === null) {
    return "";
  }

  return `; ${hid.text.charAt(0).toLowerCase()}${hid.text.slice(1, -1)}`;
};

const toRecord = (check: PortCheck, isFixLoop: boolean): PortReviewRecord => ({
  fixLoop: isFixLoop,
  rendered: check.render.isRendered,
  score: check.match.score,
});

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
  isFixNeeded,
  isLowMatch,
  toCheckText,
  toContinueText,
  toFixLines,
  toFixPrompt,
  toHidText,
  toPortCheckRef,
  toPortCheckRefs,
  toPortChecked,
  toPortGaps,
  toRecord,
  toRouteFiles,
};

export type {
  PortCheck,
  PortCheckRef,
  PortContinue,
  PortReview,
  PortReviewGaps,
  PortReviewInput,
  PortRouteGaps,
};
