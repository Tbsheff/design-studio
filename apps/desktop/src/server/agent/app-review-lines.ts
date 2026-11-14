import { PORT_TASK } from "@design-studio/contracts/port";

import type {
  AgentRunContext,
  PreviewService,
} from "../../shared/server-ports.js";
import { inspectAppDark } from "./app-review-dark.js";
import { inspectAppKit } from "./app-review-kit.js";
import type { AppReviewGaps, StudioReviewInput } from "./final-check.js";
import { EDIT_TOOL_NAMES } from "./permissions.js";
import { toKitLines } from "./port-review-kit.js";
import type { AppLineCounts } from "./prototype-review-opening.js";
import { defaultShotTarget } from "./run-target.js";
import { changedLinesSince } from "./screens.js";
import type { ChangedFile } from "./screens.js";
import type { RunToolState } from "./types.js";

type AppCheckContext = Pick<
  AgentRunContext,
  "direction" | "project" | "request" | "target" | "previewUrl"
>;

type AppCheckInput = Pick<StudioReviewInput, "baseFile" | "ctx" | "run">;

interface AppTally {
  readonly counts: readonly AppLineCounts[];
  readonly oldCode: number;
}

const APP_GAPS = new WeakMap<AppReviewGaps, AppCheckContext>();

const APP_TALLY = new WeakMap<object, AppTally>();

const NO_COUNTS: AppLineCounts = { dark: null, kit: 0, kitHigh: 0 };

const hasAppTarget = (ctx: AppCheckContext): boolean =>
  Boolean(ctx.project.app) && Boolean(ctx.target) && Boolean(ctx.previewUrl);

const isAppEdit = (ctx: AppCheckContext, run: RunToolState): boolean =>
  ctx.request.mode === "edit" &&
  ctx.request.task !== PORT_TASK &&
  run.config.level !== "wireframe";

const isAppCheckRun = (ctx: AppCheckContext, run: RunToolState): boolean =>
  hasAppTarget(ctx) && isAppEdit(ctx, run);

const toAppCheckGaps = (
  ctx: AppCheckContext,
  run: RunToolState,
  found: AppReviewGaps | null,
  toolOrder: readonly string[]
): AppReviewGaps | null => {
  if (
    !isAppCheckRun(ctx, run) ||
    !toolOrder.some((name) => EDIT_TOOL_NAMES.has(name))
  ) {
    return found;
  }

  const gaps = found ?? { isPrototype: false, mobile: false, review: false };

  APP_GAPS.set(gaps, ctx);

  return gaps;
};

const toAppLineCounts = (gaps: AppReviewGaps): AppLineCounts | null => {
  const ctx = APP_GAPS.get(gaps) ?? null;

  if (ctx === null) {
    return null;
  }

  return APP_TALLY.get(ctx)?.counts.at(-1) ?? NO_COUNTS;
};

const listChangedFiles = async (
  input: AppCheckInput
): Promise<ChangedFile[]> => {
  const startedAt = input.run.startedAt ?? null;

  if (startedAt === null) {
    return [];
  }

  return await changedLinesSince(
    input.ctx.direction.workTree,
    input.ctx.project.app?.appDir ?? "",
    startedAt,
    input.baseFile
  );
};

const setAppTally = (
  ctx: AppCheckContext,
  counts: AppLineCounts,
  oldCode: number
): void => {
  const tally = APP_TALLY.get(ctx);

  APP_TALLY.set(ctx, {
    counts: [...(tally?.counts ?? []), counts],
    oldCode: tally?.oldCode ?? oldCode,
  });
};

const listAppCheckLines = async (
  input: AppCheckInput,
  preview: PreviewService
): Promise<string[] | null> => {
  const { ctx } = input;

  if (!isAppCheckRun(ctx, input.run)) {
    return null;
  }

  const changed = await listChangedFiles(input);
  const scope = { project: ctx.project, workTree: ctx.direction.workTree };
  const url = defaultShotTarget(ctx)?.url ?? null;

  const [kit, dark] = await Promise.all([
    inspectAppKit(scope, changed),
    inspectAppDark(ctx, preview, url, changed),
  ]);

  const counts: AppLineCounts = {
    dark: dark.count,
    kit: kit.finds.length,
    kitHigh: kit.finds.filter((find) => find.isHigh).length,
  };

  setAppTally(ctx, counts, kit.oldCode + dark.oldCode);

  return [...toKitLines(kit.finds), ...dark.lines];
};

const toElementsText = (count: number): string => {
  if (count === 1) {
    return "1 raw element";
  }

  return `${count} raw elements`;
};

const toOldText = (oldCode: number): string => {
  if (oldCode === 0) {
    return "";
  }

  return ` (${oldCode} on old code not counted)`;
};

const toKitText = (tally: AppTally): string => {
  const first = tally.counts[0] ?? NO_COUNTS;
  const last = tally.counts.at(-1) ?? NO_COUNTS;
  const head = `Kit: ${toElementsText(first.kit)} found on changed lines`;

  if (first.kit === 0) {
    return `${head}${toOldText(tally.oldCode)}`;
  }

  return `${head}, ${last.kit} left${toOldText(tally.oldCode)}`;
};

const toDarkText = (tally: AppTally): string => {
  const last = tally.counts.at(-1) ?? NO_COUNTS;

  if (last.dark === null) {
    return "Dark: not checked (no dark values or no changed lines)";
  }

  if (last.dark === 1) {
    return "Dark: 1 item under AA";
  }

  return `Dark: ${last.dark} items under AA`;
};

const toAppCheckClause = (
  ctx: Pick<AgentRunContext, "direction" | "project" | "request">
): string | null => {
  const tally = APP_TALLY.get(ctx) ?? null;

  APP_TALLY.delete(ctx);

  if (tally === null) {
    return null;
  }

  return `${toKitText(tally)}; ${toDarkText(tally)}`;
};

export { listAppCheckLines, toAppCheckClause, toAppCheckGaps, toAppLineCounts };
