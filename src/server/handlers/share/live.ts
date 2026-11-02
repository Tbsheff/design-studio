import { Layer } from "effect";

import { LiveRefresher, ShareListener, ShareStore } from "../../share/index.js";

const ShareLive = Layer.mergeAll(
  LiveRefresher.layer,
  ShareListener.layer,
  ShareStore.layer
);

export { ShareLive };
