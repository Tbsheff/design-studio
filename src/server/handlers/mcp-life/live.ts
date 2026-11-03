import { Layer } from "effect";

import { ApprovalWindowQueue } from "../../export/approval-window-queue.js";
import { McpActivityLog } from "../../export/mcp-activity-log.js";
import { McpSettingsStore } from "../../export/mcp-settings-store.js";

const McpLifeLive = Layer.mergeAll(
  ApprovalWindowQueue.layer,
  McpActivityLog.layer,
  McpSettingsStore.layer
);

export { McpLifeLive };
