import { Layer } from "effect";

import { TextSearchStore, TextSearchWriter } from "../../style-scope/index.js";

const TextLive = Layer.mergeAll(TextSearchStore.layer, TextSearchWriter.layer);

export { TextLive };
