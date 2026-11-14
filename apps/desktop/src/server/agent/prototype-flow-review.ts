import type {
  PageFlow,
  PageFlowGap,
} from "@design-studio/actions/page/flow/schema";

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

const NO_FLOW: PageFlow = { gaps: [], pages: [] };

const LISTED_LINES = 6;

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

const toFlowContext = (gaps: AppReviewGaps): FlowContext | null =>
  FLOW_GAPS.get(gaps) ?? null;

const toPartSpot = (gap: PageFlowGap): string => {
  if (gap.selector === null) {
    return "";
  }

  return ` (selector ${gap.selector})`;
};

const toCopyClause = (gap: PageFlowGap): string =>
  `Copy the ${gap.part} of the first page${toPartSpot(gap)} to ${gap.page} with update_matches_page, or change both on purpose.`;

const toFlowLine = (gap: PageFlowGap): string => {
  if (gap.kind === "part-changed" || gap.kind === "part-missing") {
    return `- Flow: ${gap.detail} ${toCopyClause(gap)}`;
  }

  if (gap.kind === "token-changed") {
    return `- Flow: ${gap.detail} Use one value on every page, or change both on purpose.`;
  }

  return `- Flow: ${gap.detail} Add the same link to ${gap.page}.`;
};

const toRestLine = (count: number): string =>
  `- Flow: ${count} more gaps. Run inspect_flow_page to list them all.`;

const getFlow = async (ctx: FlowContext): Promise<PageFlow> => {
  if (!isFlowRun(ctx)) {
    return NO_FLOW;
  }

  try {
    return await inspectFlowPages(
      ctx.direction.workTree,
      null,
      ctx.project.entry
    );
  } catch {
    return NO_FLOW;
  }
};

const listFlowLines = (flow: PageFlow): string[] => {
  const lines = flow.gaps.slice(0, LISTED_LINES).map((gap) => toFlowLine(gap));

  if (flow.gaps.length > LISTED_LINES) {
    lines.push(toRestLine(flow.gaps.length - LISTED_LINES));
  }

  return lines;
};

export { getFlow, listFlowLines, toFlowContext, toFlowReviewGaps };

export type { FlowContext };
