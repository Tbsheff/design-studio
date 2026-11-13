import { Layer } from "effect";

import { McpReadStore } from "../../preview/index.js";
import { RunLogWriter } from "../../run-log/index.js";

const PortLive = Layer.mergeAll(McpReadStore.layer, RunLogWriter.layer);

export { PortLive };
