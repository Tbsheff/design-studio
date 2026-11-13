import { Layer } from "effect";

import {
  RunDecisionStore,
  RunDecisionWriter,
  RunLogStore,
  RunLogWriter,
} from "../../run-log/index.js";

const RunLive = Layer.mergeAll(
  RunLogStore.layer,
  RunLogWriter.layer,
  RunDecisionStore.layer,
  RunDecisionWriter.layer
);

export { RunLive };
