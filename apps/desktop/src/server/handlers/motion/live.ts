import { Layer } from "effect";

import { MotionStore, MotionWriter } from "../../direct-edit/index.js";

const MotionLive = Layer.mergeAll(MotionStore.layer, MotionWriter.layer);

export { MotionLive };
