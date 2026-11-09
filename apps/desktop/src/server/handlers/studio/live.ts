import { Layer } from "effect";

import { DevServerStore } from "../../app/index.js";
import {
  ActivityStore,
  McpActivityLog,
  McpApprovalStore,
  McpSettingsStore,
} from "../../mcp-life/index.js";
import { RunLogStore } from "../../run-log/index.js";
import { ProjectStore, SkillStore, StudioInfo } from "../../store/index.js";

const ActivityLive = ActivityStore.layer.pipe(
  Layer.provide(
    Layer.mergeAll(
      DevServerStore.layer,
      McpActivityLog.layer,
      McpApprovalStore.layer,
      McpSettingsStore.layer,
      ProjectStore.layer,
      RunLogStore.layer
    )
  )
);

const StudioLive = Layer.mergeAll(
  StudioInfo.layer,
  SkillStore.layer,
  ActivityLive
);

export { StudioLive };
