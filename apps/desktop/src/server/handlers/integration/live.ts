import { Layer } from "effect";

import { IntegrationStore, IntegrationWriter } from "../../publish/index.js";

const IntegrationLive = Layer.mergeAll(
  IntegrationStore.layer,
  IntegrationWriter.layer
);

export { IntegrationLive };
