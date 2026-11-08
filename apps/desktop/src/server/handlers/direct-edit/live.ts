import { Layer } from "effect";

import { DirectEditStore, DirectEditWriter } from "../../share/index.js";

const DirectEditLive = Layer.mergeAll(
  DirectEditStore.layer,
  DirectEditWriter.layer
);

export { DirectEditLive };
