import { Layer } from "effect";

import {
  CloudLinkClient,
  CloudListClient,
  CloudSession,
} from "../../cloud/index.js";
import {
  CfCli,
  LinkedPublicationStore,
  LinkedPublicationWriter,
  LocalRuntime,
  PublishPlanner,
  PublishService,
  PublishStore,
} from "../../publish/index.js";
import { DeviceBindings } from "../../store/index.js";

const ServiceLive = PublishService.layer.pipe(Layer.provide(CfCli.layer));

const LinkedLive = Layer.mergeAll(
  LinkedPublicationStore.layer.pipe(
    Layer.provide(CloudListClient.layer),
    Layer.provide(PublishStore.layer)
  ),
  LinkedPublicationWriter.layer.pipe(
    Layer.provide(CloudLinkClient.layer),
    Layer.provide(ServiceLive)
  )
).pipe(Layer.provide(DeviceBindings.layer), Layer.provide(CloudSession.layer));

const PublishLive = Layer.mergeAll(
  CfCli.layer,
  LocalRuntime.layer,
  PublishPlanner.layer,
  PublishStore.layer,
  ServiceLive,
  LinkedLive
);

export { PublishLive };
