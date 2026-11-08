import { Layer } from "effect";

import { FillStore, FillWriter } from "../../style-scope/index.js";

const FillLive = Layer.mergeAll(FillStore.layer, FillWriter.layer);

export { FillLive };
