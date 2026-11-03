import { Layer } from "effect";

import { McpReadStore } from "../../preview/index.js";

const WorkspaceLive = Layer.mergeAll(McpReadStore.layer);

export { WorkspaceLive };
