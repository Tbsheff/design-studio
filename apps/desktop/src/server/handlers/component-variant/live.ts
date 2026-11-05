import { Layer } from "effect";

import {
  ComponentVariantStore,
  ComponentVariantWriter,
} from "../../components/index.js";

const ComponentVariantLive = Layer.mergeAll(
  ComponentVariantStore.layer,
  ComponentVariantWriter.layer
);

export { ComponentVariantLive };
