import { Layer } from "effect";

import { LinkStore } from "../../canvas/links/link-store.js";
import { LinkWriter } from "../../canvas/links/link-writer.js";

const CanvasLive = Layer.mergeAll(LinkStore.layer, LinkWriter.layer);

export { CanvasLive };
