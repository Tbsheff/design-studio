import { Layer } from "effect";

import { AppFixRunner, McpReadStore } from "../../preview/index.js";

const WorkspaceLive = Layer.mergeAll(AppFixRunner.layer, McpReadStore.layer);

export { WorkspaceLive };
