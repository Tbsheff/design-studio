import { Layer } from "effect";

import { CanvasStore } from "../../canvas/canvas-store.js";
import { CanvasWriter } from "../../canvas/canvas-writer.js";
import { LinkStore } from "../../canvas/links/link-store.js";
import { LinkWriter } from "../../canvas/links/link-writer.js";

const CanvasLive = Layer.mergeAll(
  CanvasStore.layer,
  CanvasWriter.layer,
  LinkStore.layer,
  LinkWriter.layer
);

export { CanvasLive };
