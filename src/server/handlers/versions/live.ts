import { Layer } from "effect";

import { VersionStore } from "../../store/version-store.js";

const VersionsLive = Layer.mergeAll(VersionStore.layer);

export { VersionsLive };
