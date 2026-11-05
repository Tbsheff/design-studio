import { Layer } from "effect";

import { PageWriter } from "../../direct-edit/index.js";

const PageLive = Layer.mergeAll(PageWriter.layer);

export { PageLive };
