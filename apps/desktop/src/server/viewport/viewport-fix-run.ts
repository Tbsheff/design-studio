import { Effect } from "effect";

import { attemptKnown, withPagePath } from "./deps.js";
import { toCells } from "./engine/cells.js";
import type { FixKind } from "./engine/fix-rules.js";
import { inspectMatrix } from "./inspect-matrix.js";
import type { InspectCommand, MatrixInspected } from "./inspect-matrix.js";
import { inspectPageFacts } from "./viewport-fix-facts.js";
import { createFixFiles } from "./viewport-fix-files.js";
import { createFixPlan } from "./viewport-fix-plan.js";
import type { FixFinding } from "./viewport-fix-plan.js";
import type { SiteScope } from "./viewport-fix-site.js";
import type {
  FixCommand,
  FixCount,
  FixPageFacts,
  FixPlan,
  FixResult,
} from "./viewport-fix-types.js";
import { applyFixFiles } from "./viewport-fix-write.js";
import type { ViewportRuntime } from "./viewport-runtime.js";

const MAIN_DIRECTION = "main";

const toCounts = (inspected: MatrixInspected): readonly FixCount[] =>
  inspected.cells.map((cell) => ({
    clippedText: cell.clippedText,
    horizontalScroll: Number(cell.horizontalScroll),
    overflow: cell.overflow,
    tapTargets: cell.tapTargets,
    width: cell.width,
  }));

const toFindings = (
  inspected: MatrixInspected,
  kinds: readonly FixKind[]
): readonly FixFinding[] => {
  const wanted = new Set<FixKind>(kinds);

  return inspected.findings.flatMap((finding): readonly FixFinding[] => {
    if (!wanted.has(finding.kind)) {
      return [];
    }

    return [
      { kind: finding.kind, source: finding.source, width: finding.width },
    ];
  });
};

const toLocs = (
  findings: readonly FixFinding[],
  width: number
): readonly string[] => {
  const locs = new Set<string>();

  for (const finding of findings) {
    if (finding.width === width && finding.source !== null) {
      locs.add(finding.source);
    }
  }

  return [...locs];
};

const inspectAllFacts = Effect.fn("inspectAllFacts")(function* run(
  runtime: ViewportRuntime,
  url: string,
  command: FixCommand,
  findings: readonly FixFinding[]
) {
  const widths = [...new Set(command.widths)];

  const pages = yield* Effect.all(
    widths.map((width) =>
      attemptKnown(() =>
        inspectPageFacts(runtime, url, width, toLocs(findings, width))
      )
    ),
    { concurrency: "unbounded" }
  );

  const facts = new Map<number, FixPageFacts>();

  for (const [at, width] of widths.entries()) {
    const page = pages[at];

    if (page) {
      facts.set(width, page);
    }
  }

  return facts;
});

const toResult = (
  before: MatrixInspected,
  after: MatrixInspected,
  plan: FixPlan,
  versionId: string | null
): FixResult => ({
  after: toCounts(after),
  applied: plan.applied,
  before: toCounts(before),
  skipped: plan.skipped,
  versionId,
});

const toMatrix = (
  command: FixCommand,
  directionId: string
): InspectCommand => ({
  directionId,
  page: command.page,
  projectId: command.projectId,
  schemes: "light",
  widths: toCells({ schemes: "light", widths: command.widths }).map(
    (cell) => cell.width
  ),
});

const runViewportFix = Effect.fn("runViewportFix")(function* run(
  runtime: ViewportRuntime,
  command: FixCommand
) {
  const directionId = command.directionId ?? MAIN_DIRECTION;
  const matrix = toMatrix(command, directionId);
  const before = yield* inspectMatrix(runtime, matrix);

  const { direction, project } = yield* attemptKnown(() =>
    runtime.loadDirection(command.projectId, directionId)
  );

  const scope: SiteScope = {
    projectKind: project.kind,
    workTree: direction.workTree,
  };

  const base = yield* attemptKnown(() =>
    runtime.preview.directionUrl(project, direction)
  );

  const findings = toFindings(before, command.kinds);

  const facts = yield* inspectAllFacts(
    runtime,
    withPagePath(base, command.page),
    command,
    findings
  );

  const plan = yield* createFixPlan(scope, findings, facts);

  if (command.isDryRun || plan.edits.length === 0) {
    return toResult(before, before, plan, null);
  }

  const files = yield* createFixFiles(scope, plan);

  if (files.length === 0) {
    return toResult(before, before, plan, null);
  }

  const versionId = yield* applyFixFiles(
    { directionId, projectId: command.projectId },
    files,
    plan.edits.length
  );

  const after = yield* inspectMatrix(runtime, matrix);

  return toResult(before, after, plan, versionId);
});

export { runViewportFix };
