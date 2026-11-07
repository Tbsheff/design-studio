import { Layer } from "effect";

import { EffectStore, EffectWriter } from "../../direct-edit/index.js";

const EffectLive = Layer.mergeAll(EffectStore.layer, EffectWriter.layer);

export { EffectLive };
