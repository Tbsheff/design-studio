import { Layer } from "effect";

import { FillStore, FillWriter } from "../../direct-edit/index.js";

const FillLive = Layer.mergeAll(FillStore.layer, FillWriter.layer);

export { FillLive };
