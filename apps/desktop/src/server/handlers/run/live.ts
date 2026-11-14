import { Layer } from "effect";

import { CanvasStore, StateCheckStore } from "../../canvas/index.js";
import { McpReadStore } from "../../preview/index.js";
import {
  RunDecisionStore,
  RunDecisionWriter,
  RunDraftStore,
  RunLogStore,
  RunLogWriter,
  RunWaitStore,
  StateRunQueue,
  StateRunStore,
} from "../../run-log/index.js";

const RunLive = Layer.mergeAll(
  CanvasStore.layer,
  McpReadStore.layer,
  StateCheckStore.layer,
  RunLogStore.layer,
  RunLogWriter.layer,
  RunDraftStore.layer,
  RunDecisionStore.layer,
  RunDecisionWriter.layer,
  RunWaitStore.layer,
  StateRunQueue.layer,
  StateRunStore.layer
);

export { RunLive };
