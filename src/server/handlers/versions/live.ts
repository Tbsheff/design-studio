import { Layer } from "effect";

import { VersionStore } from "../../store/version-store.js";
import { VersionWriter } from "../../store/version-writer.js";

const VersionsLive = Layer.mergeAll(VersionStore.layer, VersionWriter.layer);

export { VersionsLive };
