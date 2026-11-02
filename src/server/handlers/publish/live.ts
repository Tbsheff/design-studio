import { Layer } from "effect";

import {
  CfCli,
  LocalRuntime,
  PublishService,
  PublishStore,
} from "../../publish/index.js";

const PublishLive = Layer.mergeAll(
  CfCli.layer,
  LocalRuntime.layer,
  PublishStore.layer,
  PublishService.layer.pipe(Layer.provide(CfCli.layer))
);

export { PublishLive };
