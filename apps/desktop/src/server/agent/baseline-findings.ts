import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  baselineFindingsFile,
  checkItems,
} from "../../shared/final-check-baseline.js";
import type { BaselineFindings } from "../../shared/final-check-baseline.js";
import type {
  AgentRunContext,
  PreviewService,
} from "../../shared/server-ports.js";
import { buildCheckReport } from "./check-tool.js";
import { defaultShotTarget } from "./run-target.js";
import type { RunToolState } from "./types.js";

function wantsBaseline(ctx: AgentRunContext, run: RunToolState): boolean {
  return (
    run.baseline !== null &&
    ctx.request.mode === "edit" &&
    Boolean(ctx.previewUrl) &&
    Boolean(ctx.direction.headVersionId) &&
    run.config.preset.checks.screenshots
  );
}

async function capture(
  preview: PreviewService,
  ctx: AgentRunContext,
  run: RunToolState,
  runsDir: string,
  runId: string
): Promise<void> {
  const { log: _log, ...rest } = run;

  const state: RunToolState = {
    ...rest,
    baseline: null,
    lastChecks: [],
    lastFindings: [],
  };

  const report = await buildCheckReport(preview, ctx, run.config, state);

  const body: BaselineFindings = {
    at: Date.now(),
    items: checkItems(report.results),
    screens: [
      ...new Set(
        report.results.flatMap((result) =>
          result.screen ? [result.screen] : []
        )
      ),
    ],
    url: defaultShotTarget(ctx)?.url ?? null,
  };

  await mkdir(runsDir, { recursive: true });
  await writeFile(
    path.join(runsDir, baselineFindingsFile(runId)),
    `${JSON.stringify(body, null, 2)}\n`
  );
}

export function captureBaselineFindings(
  preview: PreviewService,
  ctx: AgentRunContext,
  run: RunToolState,
  runsDir: string,
  runId: string
): void {
  const shots = run.baseline;

  if (!shots || !wantsBaseline(ctx, run)) {
    return;
  }

  const job = capture(preview, ctx, run, runsDir, runId).catch(
    (error: unknown) =>
      console.warn(
        `[agent] baseline check failed: ${error instanceof Error ? error.message : String(error)}`
      )
  );

  run.baseline = Promise.all([shots, job]).then(([found]) => found);
}
