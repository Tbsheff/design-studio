import { Layer } from "effect";

import { EffectStore, EffectWriter } from "../../style-scope/index.js";

const EffectLive = Layer.mergeAll(EffectStore.layer, EffectWriter.layer);

export { EffectLive };
