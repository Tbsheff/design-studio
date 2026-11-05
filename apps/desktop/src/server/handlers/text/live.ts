import { Layer } from "effect";

import { TextSearchStore, TextSearchWriter } from "../../direct-edit/index.js";

const TextLive = Layer.mergeAll(TextSearchStore.layer, TextSearchWriter.layer);

export { TextLive };
