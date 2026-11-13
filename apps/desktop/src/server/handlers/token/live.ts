import { Layer } from "effect";

import { TokenClassStore, TokenUsageStore } from "../../design-system/index.js";
import { McpReadStore } from "../../preview/index.js";
import {
  PrototypeTokenWriter,
  TokenSweepRunner,
} from "../../token-sweep/index.js";

const TokenLive = Layer.mergeAll(
  McpReadStore.layer,
  PrototypeTokenWriter.layer,
  TokenClassStore.layer,
  TokenSweepRunner.layer,
  TokenUsageStore.layer
);

export { TokenLive };
