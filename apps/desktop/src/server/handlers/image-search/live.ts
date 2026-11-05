import { Layer } from "effect";

import {
  ImageSearchStore,
  ImageSearchWriter,
} from "../../direct-edit/index.js";

const ImageSearchLive = Layer.mergeAll(
  ImageSearchStore.layer,
  ImageSearchWriter.layer
);

export { ImageSearchLive };
