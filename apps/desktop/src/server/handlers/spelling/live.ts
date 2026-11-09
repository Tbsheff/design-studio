import { Layer } from "effect";

import { SpellingStore, SpellingWordWriter } from "../../review/index.js";

const SpellingLive = Layer.mergeAll(
  SpellingStore.layer,
  SpellingWordWriter.layer
);

export { SpellingLive };
