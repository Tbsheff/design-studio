import { Layer } from "effect";

import { SpacingStore, SpacingWriter } from "../../components/index.js";

const SpacingLive = Layer.mergeAll(SpacingStore.layer, SpacingWriter.layer);

export { SpacingLive };
