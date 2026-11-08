import { Layer } from "effect";

import { TextStyleStore, TextStyleWriter } from "../../style-scope/index.js";

const TextStyleLive = Layer.mergeAll(
  TextStyleStore.layer,
  TextStyleWriter.layer
);

export { TextStyleLive };
