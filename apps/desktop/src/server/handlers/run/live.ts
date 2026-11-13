import { Layer } from "effect";

import {
  RunDecisionStore,
  RunDecisionWriter,
  RunDraftStore,
  RunLogStore,
  RunLogWriter,
} from "../../run-log/index.js";

const RunLive = Layer.mergeAll(
  RunLogStore.layer,
  RunLogWriter.layer,
  RunDraftStore.layer,
  RunDecisionStore.layer,
  RunDecisionWriter.layer
);

export { RunLive };
