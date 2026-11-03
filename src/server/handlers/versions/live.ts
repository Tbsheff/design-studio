import { Layer } from "effect";

import { VersionStore, VersionWriter } from "../../store/index.js";

const VersionsLive = Layer.mergeAll(VersionStore.layer, VersionWriter.layer);

export { VersionsLive };
