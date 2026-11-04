import { Effect } from "effect";

import type { ViewportRuntime } from "../../viewport/index.js";
import { toCallSet } from "./engine/index.js";
import { toScenarioSet } from "./scenario-model.js";
import { recordFrame } from "./scenario-record.js";
import { createSavedScenarios, toSavedPath } from "./scenario-saved.js";
import type { SavedScenarios } from "./scenario-saved.js";
import { loadScenarioTarget } from "./scenario-target.js";
import type { TargetCommand } from "./scenario-target.js";

const createScenarios = Effect.fn("createScenarios")(function* run(
  runtime: ViewportRuntime,
  command: TargetCommand
) {
  const target = yield* loadScenarioTarget(runtime, command);
  const observed = yield* recordFrame(runtime, target);
  const set = toCallSet(observed);

  const saved: SavedScenarios = {
    calls: set.calls,
    frameId: target.frame.id,
    isTruncated: set.isTruncated,
    opaqueCount: set.opaqueCount,
    route: `/${target.frame.path ?? ""}`,
    seenCalls: set.calls.length,
  };

  const key = { ...command, frameId: target.frame.id };

  yield* createSavedScenarios(toSavedPath(runtime.dataDir, key), saved);

  return toScenarioSet(saved);
});

export { createScenarios };
