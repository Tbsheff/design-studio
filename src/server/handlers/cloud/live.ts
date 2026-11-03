import { Layer } from "effect";

import {
  CloudClient,
  CloudSession,
  CloudSessionStore,
  CloudSessionWriter,
} from "../../cloud/index.js";

const CloudLive = CloudSessionStore.layer.pipe(
  Layer.provideMerge(CloudSession.layer),
  Layer.merge(CloudClient.layer),
  Layer.merge(CloudSessionWriter.layer)
);

export { CloudLive };
