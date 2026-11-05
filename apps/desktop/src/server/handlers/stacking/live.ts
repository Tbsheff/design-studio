import { Layer } from "effect";

import { StackingStore, StackingWriter } from "../../direct-edit/index.js";

const StackingLive = Layer.mergeAll(StackingStore.layer, StackingWriter.layer);

export { StackingLive };
