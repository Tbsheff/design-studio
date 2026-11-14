import type { PageFlowGap } from "@design-studio/actions/page/flow/schema";

import type { AgentRunContext } from "../../shared/server-ports.js";
import { inspectFlowPages } from "../canvas/page-flow/index.js";
import type { AppReviewGaps } from "./final-check.js";
import { EDIT_TOOL_NAMES } from "./permissions.js";
import type { RunToolState } from "./types.js";

type FlowContext = Pick<
  AgentRunContext,
  "direction" | "project" | "request" | "previewUrl"
>;

const FLOW_GAPS = new WeakMap<AppReviewGaps, FlowContext>();

const FLOW_COUNTS = new WeakMap<FlowContext, number>();

const LISTED_LINES = 6;

const COPY_CLAUSE =
  "Copy it with update_matches_page, or change both on purpose.";

const isFlowRun = (ctx: FlowContext): boolean =>
  ctx.project.kind === "html" &&
  !ctx.project.app &&
  Boolean(ctx.previewUrl) &&
  ctx.request.mode === "edit";

const toFlowReviewGaps = (
  ctx: FlowContext,
  run: RunToolState,
  toolOrder: readonly string[]
): AppReviewGaps | null => {
  if (
    !isFlowRun(ctx) ||
    run.config.level === "wireframe" ||
    !toolOrder.some((name) => EDIT_TOOL_NAMES.has(name))
  ) {
    return null;
  }

  const gaps: AppReviewGaps = {
    isPrototype: true,
    mobile: false,
    review: false,
  };

  FLOW_GAPS.set(gaps, ctx);

  return gaps;
};

const isFlowGaps = (gaps: AppReviewGaps): boolean => FLOW_GAPS.has(gaps);

const toFlowOpening = (gaps: AppReviewGaps, pass: number): string | null => {
  const ctx = FLOW_GAPS.get(gaps) ?? null;

  if (ctx === null || (FLOW_COUNTS.get(ctx) ?? 0) === 0) {
    return null;
  }

  if (pass > 1) {
    return "You edited again after the flow check, so the studio compared the linked pages once more.";
  }

  return "You finished a prototype with linked pages, so the studio compared the pages. Each page must keep the same header, nav, footer, :root values and style sheets.";
};

const toPartSpot = (gap: PageFlowGap): string => {
  if (gap.selector === null) {
    return "";
  }

  return ` (selector ${gap.selector})`;
};

const toFlowLine = (gap: PageFlowGap): string => {
  if (gap.kind === "part-changed" || gap.kind === "part-missing") {
    return `- Flow: ${gap.detail}${toPartSpot(gap)} ${COPY_CLAUSE}`;
  }

  if (gap.kind === "token-changed") {
    return `- Flow: ${gap.detail} Use one value on every page, or change both on purpose.`;
  }

  return `- Flow: ${gap.detail} Add the same link to ${gap.page}.`;
};

const toRestLine = (count: number): string =>
  `- Flow: ${count} more gaps. Run inspect_flow_page to list them all.`;

const listFlowGaps = async (
  ctx: FlowContext
): Promise<readonly PageFlowGap[]> => {
  try {
    const flow = await inspectFlowPages(ctx.direction.workTree, null);

    return flow.gaps;
  } catch {
    return [];
  }
};

const listFlowLines = async (ctx: FlowContext): Promise<string[]> => {
  if (!isFlowRun(ctx)) {
    return [];
  }

  const gaps = await listFlowGaps(ctx);

  FLOW_COUNTS.set(ctx, gaps.length);
  const lines = gaps.slice(0, LISTED_LINES).map((gap) => toFlowLine(gap));

  if (gaps.length > LISTED_LINES) {
    lines.push(toRestLine(gaps.length - LISTED_LINES));
  }

  return lines;
};

export { isFlowGaps, listFlowLines, toFlowOpening, toFlowReviewGaps };

export type { FlowContext };
