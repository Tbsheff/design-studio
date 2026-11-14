import type { Effect } from "effect";

import { loadTypeScript, runDirectionRead, runDirectionWrite } from "./deps.js";
import type {
  DirectionIds,
  DirectionRun,
  KnownFailure,
  PreviewService,
} from "./deps.js";
import { KitDriftError } from "./errors.js";
import { createKitDriftPlan } from "./kit-drift-apply.js";
import type { Skipped } from "./kit-drift-apply.js";
import { startKitDriftWrite, applyKitDriftCommit } from "./kit-drift-commit.js";
import { toKitDriftFailure } from "./kit-drift-failure.js";
import { runKitDriftList } from "./kit-drift-list.js";
import type { KitDriftPage, ListKitDriftCommand } from "./kit-drift-list.js";
import { getKitInventory } from "./kit-inventory.js";
import type { Ts } from "./ts-type.js";

const MAIN_DIRECTION = "main";

interface ApplyKitDriftCommand {
  readonly directionId: string | null;
  readonly ids: readonly string[];
  readonly projectId: string;
}

interface KitDriftApplied {
  readonly changed: readonly string[];
  readonly files: readonly string[];
  readonly skipped: readonly Skipped[];
  readonly versionId: string | null;
}

const toIds = (command: {
  readonly directionId: string | null;
  readonly projectId: string;
}): DirectionIds => ({
  directionId: command.directionId ?? MAIN_DIRECTION,
  projectId: command.projectId,
});

const getTypeScript = async (): Promise<Ts> => {
  const ts = await loadTypeScript();

  if (ts === null) {
    throw new KitDriftError("The TypeScript compiler is not available.");
  }

  return ts;
};

const runList = async (
  run: DirectionRun,
  command: ListKitDriftCommand,
  preview: PreviewService
): Promise<KitDriftPage> => {
  const ts = await getTypeScript();

  const render = { direction: run.direction, preview };
  const { project } = run;
  const { workTree } = run.direction;

  return await runKitDriftList(ts, { project, render, workTree }, command);
};

const runApply = async (
  run: DirectionRun,
  command: ApplyKitDriftCommand
): Promise<KitDriftApplied> => {
  const ts = await getTypeScript();

  await startKitDriftWrite(run);

  const inventory = await getKitInventory(
    ts,
    run.project,
    run.direction.workTree
  );

  const plan = await createKitDriftPlan(run, ts, inventory, command.ids);

  if (plan.changes.length === 0) {
    return { changed: [], files: [], skipped: plan.skipped, versionId: null };
  }

  const versionId = await applyKitDriftCommit(run, plan.changes);

  return {
    changed: plan.changes.flatMap((change) => change.ids),
    files: plan.changes.map((change) => change.relative),
    skipped: plan.skipped,
    versionId,
  };
};

const runKitDriftListEffect = (
  command: ListKitDriftCommand,
  preview: PreviewService
): Effect.Effect<KitDriftPage, KnownFailure> =>
  runDirectionRead(
    toIds(command),
    (run) => runList(run, command, preview),
    toKitDriftFailure
  );

const runKitDriftApplyEffect = (
  command: ApplyKitDriftCommand
): Effect.Effect<KitDriftApplied, KnownFailure> =>
  runDirectionWrite(
    toIds(command),
    (run) => runApply(run, command),
    toKitDriftFailure
  );

export { runKitDriftApplyEffect, runKitDriftListEffect };

export type { ApplyKitDriftCommand, KitDriftApplied };
