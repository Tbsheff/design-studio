import { Layer } from "effect";

import { McpReadStore } from "../../preview/index.js";

const McpReadLive = Layer.mergeAll(McpReadStore.layer);

export { McpReadLive };
