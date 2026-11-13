import { Layer } from "effect";

import {
  ChangeRestoreWriter,
  ChangeStore,
  VersionStore,
  VersionWriter,
} from "../../store/index.js";

const VersionLive = Layer.mergeAll(
  ChangeRestoreWriter.layer,
  ChangeStore.layer,
  VersionStore.layer,
  VersionWriter.layer
);

export { VersionLive };
