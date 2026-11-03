import { Layer } from "effect";

import { GalleryRunner, GalleryWriter } from "../../gallery/index.js";

const GalleryLive = Layer.mergeAll(GalleryRunner.layer, GalleryWriter.layer);

export { GalleryLive };
