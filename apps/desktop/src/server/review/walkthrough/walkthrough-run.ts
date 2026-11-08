import path from "node:path";

import type { WalkthroughSchema } from "@design-studio/actions/walkthrough/schema";
import { Effect } from "effect";

import { attemptKnown } from "../../platform/attempt/index.js";
import { loadConfig } from "../../platform/config/index.js";
import { logInfo } from "../../platform/logger/index.js";
import type { ViewportRuntime } from "../../viewport/index.js";
import { toWalkthroughId } from "./walkthrough-id.js";
import { toMockPicker, toModelPicker } from "./walkthrough-pick.js";
import {
  createSavedWalkthrough,
  createWalkthroughFolder,
} from "./walkthrough-saved-write.js";
import {
  toFolder,
  toRelativeFolder,
  toSavedPath,
} from "./walkthrough-saved.js";
import { createContactSheet } from "./walkthrough-sheet.js";
import { loadWalkTarget } from "./walkthrough-target.js";
import { runWalk } from "./walkthrough-walk.js";
import type { PickStep, WalkResult } from "./walkthrough-walk.js";

type Walkthrough = typeof WalkthroughSchema.Type;

interface RunCommand {
  readonly canWrite: boolean;
  readonly directionId: string | null;
  readonly frameId: string;
  readonly maxSteps: number;
  readonly persona: string | null;
  readonly projectId: string;
  readonly task: string;
}

const SHEET_NAME = "sheet.png";

const toPicker = (): PickStep => {
  if (loadConfig().agentMode === "mock") {
    return toMockPicker();
  }

  return toModelPicker();
};

const createSheet = async (
  folder: string,
  walked: WalkResult
): Promise<void> => {
  await createContactSheet(
    walked.steps.map((step) => path.join(folder, path.basename(step.shotPath))),
    walked.outcome,
    path.join(folder, SHEET_NAME)
  );
};

const createWalkthrough = Effect.fn("createWalkthrough")(function* run(
  runtime: ViewportRuntime,
  command: RunCommand
) {
  const target = yield* loadWalkTarget(runtime, command);
  const projectDir = runtime.projectDir(command.projectId);

  const walkthroughId = toWalkthroughId({
    canWrite: command.canWrite,
    directionId: target.directionId,
    frameId: command.frameId,
    maxSteps: command.maxSteps,
    persona: command.persona,
    projectId: command.projectId,
    task: command.task,
  });

  const outFolder = toFolder(projectDir, walkthroughId);
  const outRelative = toRelativeFolder(walkthroughId);

  yield* attemptKnown(() => createWalkthroughFolder(outFolder));

  const walked = yield* attemptKnown(() =>
    target.withPage(
      target.url,
      { height: target.height, width: target.width },
      (page) =>
        runWalk(page, {
          canWrite: command.canWrite,
          folder: outFolder,
          folderRelative: outRelative,
          maxSteps: command.maxSteps,
          persona: command.persona,
          pick: toPicker(),
          task: command.task,
        })
    )
  );

  yield* attemptKnown(() => createSheet(outFolder, walked));

  const finished: Walkthrough = {
    frictions: walked.frictions,
    outcome: walked.outcome,
    sheetPath: path.join(outRelative, SHEET_NAME),
    steps: walked.steps,
    walkthroughId,
  };

  yield* attemptKnown(() =>
    createSavedWalkthrough(toSavedPath(projectDir, walkthroughId), {
      frameId: command.frameId,
      model: loadConfig().agentMode,
      result: finished,
      task: command.task,
    })
  );

  yield* Effect.sync(() =>
    logInfo(
      `[walkthrough] ${command.projectId}/${command.frameId} ${walkthroughId} ${walked.outcome} in ${walked.steps.length} steps`
    )
  );

  return finished;
});

export { createWalkthrough };

export type { RunCommand, Walkthrough };
