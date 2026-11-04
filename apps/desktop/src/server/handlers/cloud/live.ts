import { Layer } from "effect";

import {
  CloudClient,
  CloudMigrationRunner,
  CloudSession,
  CloudSessionStore,
  CloudSessionWriter,
  OutboxStore,
  SyncRunner,
} from "../../cloud/index.js";
import { DeviceBindings } from "../../store/index.js";

const SessionLive = CloudSessionStore.layer.pipe(
  Layer.provideMerge(CloudSession.layer),
  Layer.merge(CloudClient.layer),
  Layer.merge(CloudSessionWriter.layer)
);

const SyncDepsLive = Layer.mergeAll(
  OutboxStore.layer,
  CloudMigrationRunner.layer
).pipe(Layer.provideMerge(DeviceBindings.layer));

const CloudLive = SyncRunner.layer.pipe(
  Layer.provideMerge(SyncDepsLive),
  Layer.provideMerge(SessionLive)
);

export { CloudLive };
