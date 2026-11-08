import { Layer } from "effect";

import {
  ViewportFixWriter,
  ViewportRunner,
  ViewportWriter,
} from "../../viewport/index.js";

const ViewportLive = Layer.mergeAll(
  ViewportRunner.layer,
  ViewportWriter.layer,
  ViewportFixWriter.layer
);

export { ViewportLive };
