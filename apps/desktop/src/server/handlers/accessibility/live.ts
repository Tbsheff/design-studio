import { Layer } from "effect";

import { AccessibilityStore, AccessibilityWriter } from "../../review/index.js";

const AccessibilityLive = Layer.mergeAll(
  AccessibilityStore.layer,
  AccessibilityWriter.layer
);

export { AccessibilityLive };
