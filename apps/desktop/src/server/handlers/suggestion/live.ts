import { Layer } from "effect";

import { SuggestionRunner } from "../../project-ops/index.js";
import { RunLogStore } from "../../run-log/index.js";
import { ProjectStore } from "../../store/index.js";

const SuggestionLive = SuggestionRunner.layer.pipe(
  Layer.provide(Layer.mergeAll(ProjectStore.layer, RunLogStore.layer))
);

export { SuggestionLive };
