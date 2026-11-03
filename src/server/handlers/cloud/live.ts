import { Layer } from "effect";

import {
  CloudClient,
  CloudSession,
  CloudSessionStore,
} from "../../cloud/index.js";

const CloudLive = CloudSessionStore.layer.pipe(
  Layer.provideMerge(CloudSession.layer),
  Layer.merge(CloudClient.layer)
);

export { CloudLive };
