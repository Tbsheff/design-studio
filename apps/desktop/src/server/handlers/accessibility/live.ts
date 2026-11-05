import { Layer } from "effect";

import {
  AccessibilityStore,
  AccessibilityWriter,
} from "../../direct-edit/index.js";

const AccessibilityLive = Layer.mergeAll(
  AccessibilityStore.layer,
  AccessibilityWriter.layer
);

export { AccessibilityLive };
