import { Layer } from "effect";

import {
  AccessibilityStore,
  AccessibilityWriter,
  ReaderLineStore,
  VisionRunner,
} from "../../review/index.js";

const AccessibilityLive = Layer.mergeAll(
  AccessibilityStore.layer,
  AccessibilityWriter.layer,
  ReaderLineStore.layer,
  VisionRunner.layer
);

export { AccessibilityLive };
