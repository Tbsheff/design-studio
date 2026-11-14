import type { AppReviewRecord } from "@design-studio/contracts";

import type { AgentRunContext } from "../../shared/server-ports.js";
import { appReviewGaps } from "./final-check.js";
import type { AppReviewGaps } from "./final-check.js";
import { EDIT_TOOL_NAMES } from "./permissions.js";
import { toFlowReviewGaps } from "./prototype-flow-review.js";
import {
  isStudioRan,
  toKitAfterClause,
  toKitClause,
  toKitGaps,
  toKitTally,
} from "./prototype-kit-review.js";
import type { KitTally } from "./prototype-kit-review.js";
import { isContextFrame } from "./run-target.js";
import type { RunToolState } from "./types.js";

type ReviewContext = Pick<
  AgentRunContext,
  "direction" | "project" | "target" | "request" | "previewUrl"
>;

const isPrototypeRun = (ctx: ReviewContext, run: RunToolState): boolean =>
  !ctx.project.app &&
  Boolean(ctx.previewUrl) &&
  ctx.request.mode === "edit" &&
  run.config.level !== "wireframe";

const hasReviewAfter = (
  ctx: ReviewContext,
  run: RunToolState,
  lastEdit: number
): boolean =>
  (run.reviews ?? []).some(
    (note) =>
      note.at > lastEdit &&
      (note.frame === null || isContextFrame(ctx, note.frame))
  );

const hasMobileShotAfter = (run: RunToolState, lastEdit: number): boolean =>
  (run.log?.shots ?? []).some(
    (shot) => shot.viewport === "mobile" && shot.at > lastEdit
  );

const toPrototypeReviewGaps = (
  ctx: ReviewContext,
  run: RunToolState,
  toolOrder: readonly string[]
): AppReviewGaps | null => {
  if (!isPrototypeRun(ctx, run)) {
    return null;
  }

  const lastEdit = toolOrder.findLastIndex((name) => EDIT_TOOL_NAMES.has(name));

  if (lastEdit === -1 || hasReviewAfter(ctx, run, lastEdit)) {
    return null;
  }

  return {
    isPrototype: true,
    mobile: !hasMobileShotAfter(run, lastEdit),
    review: true,
  };
};

const toKitReviewGaps = (
  ctx: ReviewContext,
  run: RunToolState,
  toolOrder: readonly string[]
): AppReviewGaps | null => {
  if (!isPrototypeRun(ctx, run)) {
    return null;
  }

  return toKitGaps(
    ctx,
    toolOrder.some((name) => EDIT_TOOL_NAMES.has(name))
  );
};

const toReviewGaps = (
  ctx: ReviewContext,
  run: RunToolState,
  toolOrder: readonly string[]
): AppReviewGaps | null =>
  appReviewGaps(ctx, run, toolOrder) ??
  toPrototypeReviewGaps(ctx, run, toolOrder) ??
  toKitReviewGaps(ctx, run, toolOrder) ??
  toFlowReviewGaps(ctx, run, toolOrder);

const toPassText = (record: AppReviewRecord, index: number): string => {
  let old = "";

  if (record.oldCode) {
    old = ` (${record.oldCode} on old code not counted)`;
  }

  let loop = "no fix loop";

  if (record.fixLoop) {
    loop = "a fix loop ran";
  }

  return `pass ${index + 1}: ${record.findings} finding(s) on changed lines${old}, ${loop}`;
};

const toRanText = (record: AppReviewRecord): string => {
  const ran: string[] = [];

  if (record.mobileShot === "studio") {
    ran.push("mobile screenshot");
  }

  if (record.review === "studio") {
    ran.push("review_frame");
  }

  return ran.join(" and ") || "checks";
};

const toKitOnlyNote = (
  tally: KitTally | null,
  records: readonly AppReviewRecord[]
): string => {
  if (tally === null) {
    return "";
  }

  return `Studio check: ${toKitClause(tally, records)}.`;
};

const toReviewNote = (
  ctx: Pick<AgentRunContext, "direction" | "project" | "request">,
  records: readonly AppReviewRecord[]
): string => {
  const tally = toKitTally(ctx);
  const ran = records.filter((record) => isStudioRan(record));
  const [first] = ran;

  if (!first) {
    return toKitOnlyNote(tally, records);
  }

  let label = "Studio check";

  if (ctx.project.app) {
    label = "Studio app check";
  }

  const passes = ran.map((record, index) => toPassText(record, index));

  const parts = [
    `${label}: the agent skipped the ${toRanText(first)} after its last edit, so the studio ran them (desktop and 390 px)`,
    ...passes,
  ];

  if (tally !== null) {
    parts.push(toKitAfterClause(tally));
  }

  return `${parts.join("; ")}.`;
};

export { toPrototypeReviewGaps, toReviewGaps, toReviewNote };
