import { Layer } from "effect";

import { ContentWriter } from "../../content/index.js";

const ContentLive = Layer.mergeAll(ContentWriter.layer);

export { ContentLive };
