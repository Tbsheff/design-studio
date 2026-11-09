import { Layer } from "effect";

import { MockupWriter } from "../../export/index.js";
import { McpReadStore } from "../../preview/index.js";

const MockupLive = Layer.mergeAll(MockupWriter.layer, McpReadStore.layer);

export { MockupLive };
