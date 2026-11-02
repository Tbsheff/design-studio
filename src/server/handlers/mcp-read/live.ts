import { Layer } from "effect";

import { McpReadStore } from "../../preview/mcp-read-store.js";

const McpReadLive = Layer.mergeAll(McpReadStore.layer);

export { McpReadLive };
