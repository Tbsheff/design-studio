import { Layer } from "effect";

import { CompletionRunner, CompletionStore } from "../../project-ops/index.js";
import { ProjectStore } from "../../store/index.js";

const CompletionLive = Layer.mergeAll(
  CompletionRunner.layer,
  CompletionStore.layer
).pipe(Layer.provide(ProjectStore.layer));

export { CompletionLive };
