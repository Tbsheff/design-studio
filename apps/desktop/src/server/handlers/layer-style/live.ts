import { Layer } from "effect";

import {
  LayerScaleWriter,
  LayerStyleStore,
  LayerStyleWriter,
} from "../../style-scope/index.js";

const LayerStyleLive = Layer.mergeAll(
  LayerScaleWriter.layer,
  LayerStyleStore.layer,
  LayerStyleWriter.layer
);

export { LayerStyleLive };
