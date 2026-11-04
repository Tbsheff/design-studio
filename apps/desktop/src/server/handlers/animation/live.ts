import { Layer } from "effect";

import { AnimationStore, AnimationWriter } from "../../state-styles/index.js";

const AnimationLive = Layer.mergeAll(
  AnimationStore.layer,
  AnimationWriter.layer
);

export { AnimationLive };
