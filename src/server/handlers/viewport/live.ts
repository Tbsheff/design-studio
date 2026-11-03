import { Layer } from "effect";

import { ViewportRunner, ViewportWriter } from "../../viewport/index.js";

const ViewportLive = Layer.mergeAll(ViewportRunner.layer, ViewportWriter.layer);

export { ViewportLive };
