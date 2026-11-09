import { Layer } from "effect";

import { SpeedRunner, SpeedStore } from "../../preview/index.js";

const SpeedLive = Layer.mergeAll(SpeedStore.layer, SpeedRunner.layer);

export { SpeedLive };
