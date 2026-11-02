import { Layer } from "effect";

import { CfCli, LocalRuntime } from "../../publish/index.js";

const PublishLive = Layer.mergeAll(CfCli.layer, LocalRuntime.layer);

export { PublishLive };
