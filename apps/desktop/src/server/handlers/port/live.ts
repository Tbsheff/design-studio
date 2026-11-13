import { Layer } from "effect";

import { McpReadStore } from "../../preview/index.js";
import { PortMatchStore } from "../../review/index.js";
import { RunLogWriter } from "../../run-log/index.js";

const PortLive = Layer.mergeAll(
  McpReadStore.layer,
  PortMatchStore.layer,
  RunLogWriter.layer
);

export { PortLive };
