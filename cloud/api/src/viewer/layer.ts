import { Layer } from "effect";

import { ViewerAuth } from "../http/middleware/viewer.js";
import { TenantBlobs } from "../tenant/blobs.js";
import { TenantDb } from "../tenant/db.js";
import { Resolver } from "../tenant/resolver.js";
import { ViewerDb } from "../tenant/viewer-db.js";

const viewerLayer = Layer.mergeAll(
  ViewerAuth.layer.pipe(Layer.provide(Resolver.layer)),
  ViewerDb.layer,
  TenantBlobs.layer.pipe(Layer.provide(TenantDb.layer))
);

export { viewerLayer };
