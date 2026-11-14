import { Layer } from "effect";

import { SpacingStore, SpacingWriter } from "../../share/index.js";
import { DividerStore, DividerWriter } from "../../style-scope/index.js";

const SpacingLive = Layer.mergeAll(
  SpacingStore.layer,
  SpacingWriter.layer,
  DividerStore.layer,
  DividerWriter.layer
);

export { SpacingLive };
