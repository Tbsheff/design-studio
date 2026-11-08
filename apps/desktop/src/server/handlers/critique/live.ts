import { Layer } from "effect";

import {
  AttentionRunner,
  AttentionStore,
  CritiqueRunner,
  CritiqueStore,
} from "../../review/index.js";

const CritiqueLive = Layer.mergeAll(
  CritiqueRunner.layer,
  CritiqueStore.layer,
  AttentionRunner.layer,
  AttentionStore.layer
);

export { CritiqueLive };
