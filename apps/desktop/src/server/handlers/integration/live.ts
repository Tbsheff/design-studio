import { Layer } from "effect";

import {
  IntegrationStore,
  IntegrationWriter,
} from "../../direct-edit/index.js";

const IntegrationLive = Layer.mergeAll(
  IntegrationStore.layer,
  IntegrationWriter.layer
);

export { IntegrationLive };
