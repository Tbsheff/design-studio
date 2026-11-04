import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import type { ScenarioRunSchema } from "@design-studio/actions/scenario/schema";
import { withFrameStateHost } from "@design-studio/contracts/frame-state";
import { Effect } from "effect";

import { startTrial, stopTrial } from "../../app/index.js";
import { attemptKnown } from "../../platform/attempt/index.js";
import { composeSheet, removeShots } from "../../viewport/index.js";
import type { ScenarioDraft } from "./engine/index.js";
import { toDrafts, toMockRules, toUnseen } from "./scenario-model.js";
import { createPageReport } from "./scenario-page.js";
import type { PageReport } from "./scenario-page.js";
import {
  readSavedScenarios,
  toSavedPath,
  toSheetPath,
} from "./scenario-saved.js";
import { loadScenarioTarget } from "./scenario-target.js";
import type {
  ScenarioRuntime,
  ScenarioTarget,
  TargetCommand,
} from "./scenario-target.js";

interface ScenarioShot {
  readonly file: string;
  readonly row: number;
}

type ScenarioRun = typeof ScenarioRunSchema.Type;

type ScenarioResult = ScenarioRun["results"][number];

const OVERFLOW_KINDS: ReadonlySet<string> = new Set([
  "past-viewport",
  "scrolls-sideways",
]);

const toResult = (draft: ScenarioDraft, report: PageReport): ScenarioResult => {
  const { findings } = report;
  const { consoleErrors } = report;
  const { kind } = draft;
  const scenarioId = draft.id;

  const clippedCount = findings.filter(
    (entry) => entry.kind === "clipped"
  ).length;

  const overflowCount = findings.filter((entry) =>
    OVERFLOW_KINDS.has(entry.kind)
  ).length;

  return { clippedCount, consoleErrors, kind, overflowCount, scenarioId };
};

const renderScenario = Effect.fn("renderScenario")(function* run(
  runtime: ScenarioRuntime,
  target: ScenarioTarget,
  draft: ScenarioDraft,
  shotFile: string
) {
  const withPage = runtime.preview.withPage?.bind(runtime.preview) ?? null;

  if (withPage === null) {
    return yield* new BadRequest({
      message: "Rendering is not available, so scenarios cannot be rendered.",
    });
  }

  const mocks = toMockRules(draft);
  const trialId = startTrial(target.projectDir, { mocks, recorder: null });
  const url = withFrameStateHost(target.url, trialId);
  const { height, width } = target.frame;
  const stop = Effect.sync(() => stopTrial(target.projectDir, trialId));

  return yield* attemptKnown(() =>
    withPage(url, { height, width }, (page) => createPageReport(page, shotFile))
  ).pipe(Effect.ensuring(stop));
});

const runScenarios = Effect.fn("runScenarios")(function* run(
  runtime: ScenarioRuntime,
  command: TargetCommand
) {
  const target = yield* loadScenarioTarget(runtime, command);
  const key = { ...command, frameId: target.frame.id };
  const saved = yield* readSavedScenarios(toSavedPath(runtime.dataDir, key));

  if (saved === null) {
    return yield* new NotFound({
      message: `No scenarios are saved for frame ${key.frameId}. Run create_scenario first.`,
    });
  }

  const folder = yield* attemptKnown(() =>
    mkdtemp(path.join(os.tmpdir(), "ds-scenario-"))
  );

  const shots: ScenarioShot[] = [];
  const results: ScenarioResult[] = [];

  const render = Effect.gen(function* each() {
    for (const draft of toDrafts(saved)) {
      const file = path.join(folder, `${draft.id}.png`);
      const report = yield* renderScenario(runtime, target, draft, file);

      shots.push({ file, row: 0 });
      results.push(toResult(draft, report));
    }

    return yield* composeSheet(shots, toSheetPath(runtime.dataDir, key));
  });

  const cleanup = removeShots(shots).pipe(
    Effect.andThen(
      attemptKnown(() => rm(folder, { force: true, recursive: true })).pipe(
        Effect.ignore
      )
    )
  );

  const contactSheet = yield* render.pipe(Effect.ensuring(cleanup));
  const { frameId } = key;
  const unseen = toUnseen(saved);

  const summary: ScenarioRun = { contactSheet, frameId, results, unseen };

  return summary;
});

export { runScenarios };

export type { ScenarioResult, ScenarioRun };
