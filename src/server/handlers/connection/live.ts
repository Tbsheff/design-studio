import { Layer } from "effect";

import {
  ApprovalWindowQueue,
  McpActivityLog,
  McpApprovalStore,
  McpListenerRunner,
  McpSettingsStore,
  McpSettingsWriter,
} from "../../mcp-life/index.js";

const ConnectionLive = Layer.mergeAll(
  ApprovalWindowQueue.layer,
  McpActivityLog.layer,
  McpApprovalStore.layer,
  McpListenerRunner.layer,
  McpSettingsStore.layer,
  McpSettingsWriter.layer
);

export { ConnectionLive };
