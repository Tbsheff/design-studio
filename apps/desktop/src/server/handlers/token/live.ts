import { Layer } from "effect";

import { TokenClassStore, TokenUsageStore } from "../../design-system/index.js";
import { McpReadStore } from "../../preview/index.js";
import { TokenSweepRunner } from "../../token-sweep/index.js";

const TokenLive = Layer.mergeAll(
  McpReadStore.layer,
  TokenClassStore.layer,
  TokenSweepRunner.layer,
  TokenUsageStore.layer
);

export { TokenLive };
