import { Layer } from "effect";

import { RunLogStore, RunLogWriter } from "../../run-log/index.js";

const RunLive = Layer.mergeAll(RunLogStore.layer, RunLogWriter.layer);

export { RunLive };
