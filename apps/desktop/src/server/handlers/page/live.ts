import { Layer } from "effect";

import { PageMatchStore, PageMatchWriter } from "../../canvas/index.js";
import { PageWriter } from "../../share/index.js";

const PageLive = Layer.mergeAll(
  PageWriter.layer,
  PageMatchStore.layer,
  PageMatchWriter.layer
);

export { PageLive };
