import { Layer } from "effect";

import { ScenarioRunner, ScenarioStore } from "../../review/index.js";

const ScenarioLive = Layer.mergeAll(ScenarioRunner.layer, ScenarioStore.layer);

export { ScenarioLive };
