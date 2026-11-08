import { Layer } from "effect";

import { PatternStore, PatternWriter } from "../../components/index.js";

const PatternLive = Layer.mergeAll(PatternStore.layer, PatternWriter.layer);

export { PatternLive };
