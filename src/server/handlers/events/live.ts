import { Layer } from "effect";

import {
  ChangeFeed,
  EventQueue,
  RenderTracker,
  SaveQueue,
} from "../../events/index.js";

const EventsLive = Layer.mergeAll(
  EventQueue.layer,
  ChangeFeed.layer,
  RenderTracker.layer,
  SaveQueue.layer
);

export { EventsLive };
