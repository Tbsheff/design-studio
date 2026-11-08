import { Layer } from "effect";

import { SpacingStore, SpacingWriter } from "../../share/index.js";

const SpacingLive = Layer.mergeAll(SpacingStore.layer, SpacingWriter.layer);

export { SpacingLive };
