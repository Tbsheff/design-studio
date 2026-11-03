import { Layer } from "effect";

import {
  ApprovalWindowQueue,
  McpActivityLog,
  McpApprovalStore,
  McpSettingsStore,
  McpSettingsWriter,
} from "../../mcp-life/index.js";

const ConnectionLive = Layer.mergeAll(
  ApprovalWindowQueue.layer,
  McpActivityLog.layer,
  McpApprovalStore.layer,
  McpSettingsStore.layer,
  McpSettingsWriter.layer
);

export { ConnectionLive };
