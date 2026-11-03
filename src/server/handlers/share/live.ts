import { Layer } from "effect";

import { CloudLinkClient, CloudSession } from "../../cloud/index.js";
import {
  LinkedShareWriter,
  LiveRefresher,
  ShareLinkStore,
  ShareListener,
  ShareStore,
} from "../../share/index.js";
import { DeviceBindings } from "../../store/index.js";

const LinkedLive = LinkedShareWriter.layer.pipe(
  Layer.provide(CloudLinkClient.layer),
  Layer.provide(ShareLinkStore.layer),
  Layer.provide(DeviceBindings.layer),
  Layer.provide(CloudSession.layer)
);

const ShareLive = Layer.mergeAll(
  LiveRefresher.layer,
  ShareLinkStore.layer,
  ShareListener.layer,
  ShareStore.layer,
  LinkedLive
);

export { ShareLive };
