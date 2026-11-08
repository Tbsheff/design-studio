import { Layer } from "effect";

import { WalkthroughRunner, WalkthroughStore } from "../../review/index.js";

const WalkthroughLive = Layer.mergeAll(
  WalkthroughRunner.layer,
  WalkthroughStore.layer
);

export { WalkthroughLive };
