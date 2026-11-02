import { Layer } from "effect";

import {
  CfCli,
  LocalRuntime,
  PublishPlanner,
  PublishService,
  PublishStore,
} from "../../publish/index.js";

const PublishLive = Layer.mergeAll(
  CfCli.layer,
  LocalRuntime.layer,
  PublishPlanner.layer,
  PublishStore.layer,
  PublishService.layer.pipe(Layer.provide(CfCli.layer))
);

export { PublishLive };
