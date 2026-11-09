import { Layer } from "effect";

import { RegistryWriter } from "../../components/index.js";
import { ComponentUsageStore } from "../../preview/index.js";

const ComponentLive = Layer.mergeAll(
  ComponentUsageStore.layer,
  RegistryWriter.layer
);

export { ComponentLive };
