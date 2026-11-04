import { Layer } from "effect";

import { ShareLiveClient } from "../platform/share-live-client.js";
import { TenantDb } from "../tenant/db.js";
import { ShareRepo } from "../tenant/repos/share.js";

const shareLayer = Layer.mergeAll(
  ShareRepo.layer.pipe(Layer.provide(TenantDb.layer)),
  ShareLiveClient.layer
);

export { shareLayer };
