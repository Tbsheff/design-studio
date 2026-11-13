import { Layer } from "effect";

import { ChangeStore, VersionStore, VersionWriter } from "../../store/index.js";

const VersionLive = Layer.mergeAll(
  ChangeStore.layer,
  VersionStore.layer,
  VersionWriter.layer
);

export { VersionLive };
