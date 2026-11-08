import { Layer } from "effect";

import { PageWriter } from "../../share/index.js";

const PageLive = Layer.mergeAll(PageWriter.layer);

export { PageLive };
