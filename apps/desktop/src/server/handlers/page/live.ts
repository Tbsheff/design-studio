import { Layer } from "effect";

import { PageWriter } from "../../components/index.js";

const PageLive = Layer.mergeAll(PageWriter.layer);

export { PageLive };
