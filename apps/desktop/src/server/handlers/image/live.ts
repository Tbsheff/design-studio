import { Layer } from "effect";

import {
  ImageGeneratorRunner,
  ImageProviderStore,
} from "../../image-generate/index.js";

const ImageLive = Layer.mergeAll(
  ImageGeneratorRunner.layer,
  ImageProviderStore.layer
);

export { ImageLive };
