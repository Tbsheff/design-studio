import { Layer } from "effect";

import { TextStyleStore, TextStyleWriter } from "../../direct-edit/index.js";

const TextStyleLive = Layer.mergeAll(
  TextStyleStore.layer,
  TextStyleWriter.layer
);

export { TextStyleLive };
