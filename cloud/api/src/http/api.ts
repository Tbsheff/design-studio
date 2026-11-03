import { Layer } from "effect";
import { HttpApi, HttpApiBuilder } from "effect/http-api";

import { GatesLive } from "./groups/gates.js";
import { KeysGroup, keysHandlers } from "./groups/keys.js";
import { ProjectsGroup, projectsHandlers } from "./groups/projects.js";
import { SyncGateLive } from "./sync/sync-gate.js";
import { SyncSigner } from "./sync/sync-signer.js";
import { SyncGroup, syncHandlers } from "./sync/sync.js";

const StudioApi = HttpApi.make("studio")
  .add(ProjectsGroup)
  .add(KeysGroup)
  .add(SyncGroup);

const ProjectsApiLive = HttpApiBuilder.group(
  StudioApi,
  "projects",
  projectsHandlers
);

const KeysApiLive = HttpApiBuilder.group(StudioApi, "keys", keysHandlers);

const SyncApiLive = HttpApiBuilder.group(StudioApi, "sync", syncHandlers);

const GroupsApiLive = Layer.mergeAll(
  ProjectsApiLive,
  KeysApiLive,
  SyncApiLive
).pipe(
  Layer.provide(GatesLive),
  Layer.provide(SyncGateLive),
  Layer.provide(SyncSigner.layer)
);

const StudioApiLive = HttpApiBuilder.layer(StudioApi).pipe(
  Layer.provide(GroupsApiLive)
);

export { GroupsApiLive, StudioApi, StudioApiLive };
