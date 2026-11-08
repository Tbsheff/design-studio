import { Layer } from "effect";

import { StackingStore, StackingWriter } from "../../share/index.js";

const StackingLive = Layer.mergeAll(StackingStore.layer, StackingWriter.layer);

export { StackingLive };
