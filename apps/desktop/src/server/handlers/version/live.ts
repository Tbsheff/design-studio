import { Layer } from "effect";

import { VersionStore, VersionWriter } from "../../store/index.js";

const VersionLive = Layer.mergeAll(VersionStore.layer, VersionWriter.layer);

export { VersionLive };
