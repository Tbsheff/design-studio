import { Layer } from "effect";

import {
  LayerLayoutWriter,
  LayerScaleWriter,
  LayerStyleStore,
  LayerStyleWriter,
} from "../../style-scope/index.js";

const LayerStyleLive = Layer.mergeAll(
  LayerLayoutWriter.layer,
  LayerScaleWriter.layer,
  LayerStyleStore.layer,
  LayerStyleWriter.layer
);

export { LayerStyleLive };
