import { Layer } from "effect";

import { ImageSearchStore, ImageSearchWriter } from "../../components/index.js";

const ImageSearchLive = Layer.mergeAll(
  ImageSearchStore.layer,
  ImageSearchWriter.layer
);

export { ImageSearchLive };
