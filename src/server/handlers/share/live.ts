import { Layer } from "effect";

import {
  LiveRefresher,
  ShareLinkStore,
  ShareListener,
  ShareStore,
} from "../../share/index.js";

const ShareLive = Layer.mergeAll(
  LiveRefresher.layer,
  ShareLinkStore.layer,
  ShareListener.layer,
  ShareStore.layer
);

export { ShareLive };
