import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import { Effect } from "effect";

import { attemptKnown } from "../../platform/attempt/index.js";
import type { ViewportRuntime } from "../../viewport/index.js";
import { toDrafts, toMockRules } from "./scenario-model.js";
import { readSavedScenarios, toSavedPath } from "./scenario-saved.js";
import { loadScenarioTarget } from "./scenario-target.js";
import type { TargetCommand } from "./scenario-target.js";

interface ApplyCommand extends TargetCommand {
  readonly scenarioId: string | null;
}

const toStateId = (frameId: string): string => `scn-${frameId}`;

const applySavedScenario = Effect.fn("applyScenario")(function* run(
  runtime: ViewportRuntime,
  command: ApplyCommand
) {
  const target = yield* loadScenarioTarget(runtime, command);
  const frameId = target.frame.id;

  if (command.scenarioId === null) {
    yield* attemptKnown(() =>
      runtime.applyFrameState(target.project, {
        frame: frameId,
        mock: null,
        state: "default",
      })
    );

    const cleared = { frameId, scenarioId: null, stateId: null };

    return cleared;
  }

  const key = { ...command, frameId };
  const saved = yield* readSavedScenarios(toSavedPath(runtime.dataDir, key));

  if (saved === null) {
    return yield* new NotFound({
      message: `No scenarios are saved for frame ${frameId}. Run create_scenario first.`,
    });
  }

  const draft =
    toDrafts(saved).find((entry) => entry.id === command.scenarioId) ?? null;

  if (draft === null) {
    return yield* new BadRequest({
      message: `No scenario ${command.scenarioId} on frame ${frameId}. Use list_scenario for the ids.`,
    });
  }

  const stateId = toStateId(frameId);

  yield* attemptKnown(() =>
    runtime.applyFrameState(target.project, {
      frame: frameId,
      mock: {
        name: draft.name,
        rules: toMockRules(draft),
        signedIn: true,
      },
      state: stateId,
    })
  );

  const scenarioId = draft.id;

  return { frameId, scenarioId, stateId };
});

export { applySavedScenario };
