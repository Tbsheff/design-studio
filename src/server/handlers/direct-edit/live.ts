import { Layer } from "effect";

import { DirectEditStore, DirectEditWriter } from "../../direct-edit/index.js";

const DirectEditLive = Layer.mergeAll(
  DirectEditStore.layer,
  DirectEditWriter.layer
);

export { DirectEditLive };
