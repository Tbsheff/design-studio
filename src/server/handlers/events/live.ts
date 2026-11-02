import { Layer } from "effect";

import { ChangeFeed } from "../../events/change-feed.js";
import { EventBus } from "../../events/event-bus.js";
import { RenderTracker } from "../../events/render-tracker.js";
import { SaveQueue } from "../../events/save-queue.js";

const EventsLive = Layer.mergeAll(
  EventBus.layer,
  ChangeFeed.layer,
  RenderTracker.layer,
  SaveQueue.layer
);

export { EventsLive };
