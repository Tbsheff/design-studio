import { Layer } from "effect";

import {
  RunDraftStore,
  RunLogStore,
  RunLogWriter,
} from "../../run-log/index.js";

const RunLive = Layer.mergeAll(
  RunLogStore.layer,
  RunLogWriter.layer,
  RunDraftStore.layer
);

export { RunLive };
