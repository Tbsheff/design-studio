import { Layer } from "effect";

import { GalleryStore, GalleryWriter } from "../../gallery/index.js";

const GalleryLive = Layer.mergeAll(GalleryStore.layer, GalleryWriter.layer);

export { GalleryLive };
