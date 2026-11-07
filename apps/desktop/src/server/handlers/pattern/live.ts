import { Layer } from "effect";

import { PatternStore, PatternWriter } from "../../direct-edit/index.js";

const PatternLive = Layer.mergeAll(PatternStore.layer, PatternWriter.layer);

export { PatternLive };
