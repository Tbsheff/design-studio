import { Layer } from "effect";

import { McpReadStore } from "../../preview/index.js";
import { ImpactRunner, ImpactStore } from "../../review/index.js";

const ImpactLive = Layer.mergeAll(
  ImpactStore.layer,
  ImpactRunner.layer,
  McpReadStore.layer
);

export { ImpactLive };
