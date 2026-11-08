import { Layer } from "effect";

import { LayerStyleStore, LayerStyleWriter } from "../../style-scope/index.js";

const LayerStyleLive = Layer.mergeAll(
  LayerStyleStore.layer,
  LayerStyleWriter.layer
);

export { LayerStyleLive };
