import { Layer } from "effect";

import {
  AccessibilityStore,
  AccessibilityWriter,
  VisionRunner,
} from "../../review/index.js";

const AccessibilityLive = Layer.mergeAll(
  AccessibilityStore.layer,
  AccessibilityWriter.layer,
  VisionRunner.layer
);

export { AccessibilityLive };
